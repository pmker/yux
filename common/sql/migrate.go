package sql

import (
	"database/sql"
	"errors"
	"fmt"
	"sort"
	"time"

	"github.com/rubenv/sql-migrate"
	"gopkg.in/gorp.v1"
)

var tableName = "gorp_migrations"
var schemaName = ""

func newTxError(migration *migrate.PlannedMigration, err error) error {
	return &migrate.TxError{
		Migration: migration.Migration,
		Err:       err,
	}
}

// Set the name of the table used to store migration info.
//
// Should be called before any other call such as (Exec, ExecMax, ...).
func SetTable(name string) {
	if name != "" {
		tableName = name
	}
}

// SetSchema sets the name of a schema that the migration table be referenced.
func SetSchema(name string) {
	if name != "" {
		schemaName = name
	}
}

type migrationById []*migrate.Migration

func (b migrationById) Len() int           { return len(b) }
func (b migrationById) Swap(i, j int)      { b[i], b[j] = b[j], b[i] }
func (b migrationById) Less(i, j int) bool { return b[i].Less(b[j]) }

// Execute a set of migrations
//
// Returns the number of applied migrations.
func ExecMigration(db *sql.DB, dialect string, m migrate.MigrationSource, dir migrate.MigrationDirection, prefix string) (int, error) {
	return ExecMax(db, dialect, m, dir, 0, prefix)
}

// Execute a set of migrations
//
// Will apply at most `max` migrations. Pass 0 for no limit (or use Exec).
//
// Returns the number of applied migrations.
func ExecMax(db *sql.DB, dialect string, m migrate.MigrationSource, dir migrate.MigrationDirection, max int, prefix string) (int, error) {
	migrations, dbMap, err := PlanMigration(db, dialect, m, dir, max, prefix)
	if err != nil {
		return 0, err
	}

	// Apply migrations
	applied := 0
	for _, migration := range migrations {
		var executor migrate.SqlExecutor

		if migration.DisableTransaction {
			executor = dbMap
		} else {
			executor, err = dbMap.Begin()
			if err != nil {
				return applied, newTxError(migration, err)
			}
		}

		for _, stmt := range migration.Queries {
			if _, err := executor.Exec(stmt); err != nil {
				if trans, ok := executor.(*gorp.Transaction); ok {
					trans.Rollback()
				}

				return applied, newTxError(migration, err)
			}
		}

		switch dir {
		case migrate.Up:
			err = executor.Insert(&migrate.MigrationRecord{
				Id:        migration.Id,
				AppliedAt: time.Now(),
			})
			if err != nil {
				if trans, ok := executor.(*gorp.Transaction); ok {
					trans.Rollback()
				}

				return applied, newTxError(migration, err)
			}
		case migrate.Down:
			_, err := executor.Delete(&migrate.MigrationRecord{
				Id: migration.Id,
			})
			if err != nil {
				if trans, ok := executor.(*gorp.Transaction); ok {
					trans.Rollback()
				}

				return applied, newTxError(migration, err)
			}
		default:
			panic("Not possible")
		}

		if trans, ok := executor.(*gorp.Transaction); ok {
			if err := trans.Commit(); err != nil {
				return applied, newTxError(migration, err)
			}
		}

		applied++
	}

	return applied, nil
}

// Plan a migration.
func PlanMigration(db *sql.DB, dialect string, m migrate.MigrationSource, dir migrate.MigrationDirection, max int, prefix string) ([]*migrate.PlannedMigration, *gorp.DbMap, error) {
	dbMap, err := getMigrationDbMap(db, dialect)
	if err != nil {
		return nil, nil, err
	}

	migrations, err := m.FindMigrations()
	if err != nil {
		return nil, nil, err
	}

	var migrationRecords []migrate.MigrationRecord
	_, err = dbMap.Select(&migrationRecords, fmt.Sprintf("SELECT * FROM %s WHERE id LIKE '%s%%'", dbMap.Dialect.QuotedTableForQuery(schemaName, tableName), prefix))
	if err != nil {
		return nil, nil, err
	}

	// Sort migrations that have been run by Id.
	var existingMigrations []*migrate.Migration
	for _, migrationRecord := range migrationRecords {
		existingMigrations = append(existingMigrations, &migrate.Migration{
			Id: migrationRecord.Id,
		})
	}
	sort.Sort(migrationById(existingMigrations))

	// Get last migration that was run
	record := &migrate.Migration{}
	if len(existingMigrations) > 0 {
		record = existingMigrations[len(existingMigrations)-1]
	}

	result := make([]*migrate.PlannedMigration, 0)

	// Add missing migrations up to the last run migration.
	// This can happen for example when merges happened.
	if len(existingMigrations) > 0 {
		result = append(result, migrate.ToCatchup(migrations, existingMigrations, record)...)
	}

	// Figure out which migrations to apply
	toApply := migrate.ToApply(migrations, record.Id, dir)
	toApplyCount := len(toApply)
	if max > 0 && max < toApplyCount {
		toApplyCount = max
	}
	for _, v := range toApply[0:toApplyCount] {

		if dir == migrate.Up {
			result = append(result, &migrate.PlannedMigration{
				Migration:          v,
				Queries:            v.Up,
				DisableTransaction: v.DisableTransactionUp,
			})
		} else if dir == migrate.Down {
			result = append(result, &migrate.PlannedMigration{
				Migration:          v,
				Queries:            v.Down,
				DisableTransaction: v.DisableTransactionDown,
			})
		}
	}

	return result, dbMap, nil
}

func getMigrationDbMap(db *sql.DB, dialect string) (*gorp.DbMap, error) {
	d, ok := migrate.MigrationDialects[dialect]
	if !ok {
		return nil, fmt.Errorf("Unknown dialect: %s", dialect)
	}

	// When using the mysql driver, make sure that the parseTime option is
	// configured, otherwise it won't map time columns to time.Time. See
	// https://github.com/rubenv/sql-migrate/issues/2
	if dialect == "mysql" {
		var out *time.Time
		err := db.QueryRow("SELECT NOW()").Scan(&out)
		if err != nil {
			if err.Error() == "sql: Scan error on column index 0: unsupported driver -> Scan pair: []uint8 -> *time.Time" ||
				err.Error() == "sql: Scan error on column index 0: unsupported Scan, storing driver.Value type []uint8 into type *time.Time" {
				return nil, errors.New(`Cannot parse dates.

Make sure that the parseTime option is supplied to your database connection.
Check https://github.com/go-sql-driver/mysql#parsetime for more info.`)
			} else {
				return nil, err
			}
		}
	}

	// Create migration database map
	dbMap := &gorp.DbMap{Db: db, Dialect: d}
	dbMap.AddTableWithNameAndSchema(migrate.MigrationRecord{}, schemaName, tableName).SetKeys(false, "Id")
	//dbMap.TraceOn("", log.New(os.Stdout, "migrate: ", log.Lmicroseconds))

	err := dbMap.CreateTablesIfNotExists()
	if err != nil {
		return nil, err
	}

	return dbMap, nil
}
