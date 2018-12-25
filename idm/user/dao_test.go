package user

import (
	"context"
	"fmt"
	"log"
	"sync"
	"testing"

	"github.com/golang/protobuf/ptypes"
	"github.com/golang/protobuf/ptypes/any"
	"github.com/micro/go-micro/errors"

	"github.com/pydio/cells/common/config"
	"github.com/pydio/cells/common/proto/idm"
	"github.com/pydio/cells/common/service/proto"
	"github.com/pydio/cells/common/sql"

	. "github.com/smartystreets/goconvey/convey"
	// SQLite is used for the tests.
	_ "github.com/mattn/go-sqlite3"
	_ "gopkg.in/doug-martin/goqu.v4/adapters/sqlite3"
)

var (
	ctx     context.Context
	mockDAO DAO

	wg sync.WaitGroup
)

type server struct{}

func TestMain(m *testing.M) {

	var options config.Map

	dao := sql.NewDAO("sqlite3", "file::memory:?mode=memory&cache=shared", "idm_user")
	if dao == nil {
		fmt.Print("could not start test")
		return
	}

	d := NewDAO(dao)
	if err := d.Init(options); err != nil {
		fmt.Print("could not start test ", err)
		return
	}

	mockDAO = d.(DAO)

	m.Run()
	wg.Wait()
}

func TestQueryBuilder(t *testing.T) {

	sqliteDao := mockDAO.(*sqlimpl)
	converter := &queryConverter{
		treeDao: sqliteDao.IndexSQL,
	}

	Convey("Query Builder", t, func() {

		singleQ1, singleQ2 := new(idm.UserSingleQuery), new(idm.UserSingleQuery)

		singleQ1.Login = "user1"
		singleQ1.Password = "passwordUser1"

		singleQ2.Login = "user2"
		singleQ2.Password = "passwordUser2"

		singleQ1Any, err := ptypes.MarshalAny(singleQ1)
		So(err, ShouldBeNil)

		singleQ2Any, err := ptypes.MarshalAny(singleQ2)
		So(err, ShouldBeNil)

		var singleQueries []*any.Any
		singleQueries = append(singleQueries, singleQ1Any)
		singleQueries = append(singleQueries, singleQ2Any)

		simpleQuery := &service.Query{
			SubQueries: singleQueries,
			Operation:  service.OperationType_OR,
			Offset:     0,
			Limit:      10,
		}

		s := sql.NewQueryBuilder(simpleQuery, converter).Expression("sqlite3")
		So(s, ShouldNotBeNil)

	})

	Convey("Query Builder with join fields", t, func() {

		_, _, e := mockDAO.Add(&idm.User{
			Login:     "username",
			Password:  "xxxxxxx",
			GroupPath: "/path/to/group",
		})
		So(e, ShouldBeNil)

		singleQ1, singleQ2 := new(idm.UserSingleQuery), new(idm.UserSingleQuery)
		singleQ1.GroupPath = "/path/to/group"
		singleQ1.HasRole = "a_role_name"

		singleQ2.AttributeName = "hidden"
		singleQ2.AttributeAnyValue = true
		//		singleQ2.Not = true

		singleQ1Any, err := ptypes.MarshalAny(singleQ1)
		So(err, ShouldBeNil)

		singleQ2Any, err := ptypes.MarshalAny(singleQ2)
		So(err, ShouldBeNil)

		var singleQueries []*any.Any
		singleQueries = append(singleQueries, singleQ1Any)
		singleQueries = append(singleQueries, singleQ2Any)

		simpleQuery := &service.Query{
			SubQueries: singleQueries,
			Operation:  service.OperationType_AND,
			Offset:     0,
			Limit:      10,
		}

		s := sql.NewQueryBuilder(simpleQuery, converter).Expression("sqlite")
		So(s, ShouldNotBeNil)

	})

	Convey("Test DAO", t, func() {

		_, _, fail := mockDAO.Add(map[string]string{})
		So(fail, ShouldNotBeNil)

		_, _, err := mockDAO.Add(&idm.User{
			Login:     "username",
			Password:  "xxxxxxx",
			GroupPath: "/path/to/group",
			Attributes: map[string]string{
				"displayName": "John Doe",
				"hidden":      "false",
				"active":      "true",
			},
			Roles: []*idm.Role{
				{Uuid: "1", Label: "Role1"},
				{Uuid: "2", Label: "Role2"},
			},
		})

		So(err, ShouldBeNil)

		{
			users := new([]interface{})
			e := mockDAO.Search(&service.Query{Limit: -1}, users)
			So(e, ShouldBeNil)
			So(users, ShouldHaveLength, 5)
		}

		{
			res, e := mockDAO.Count(&service.Query{Limit: -1})
			So(e, ShouldBeNil)
			So(res, ShouldEqual, 5)
		}

		{
			users := new([]interface{})
			e := mockDAO.Search(&service.Query{Offset: 1, Limit: 2}, users)
			So(e, ShouldBeNil)
			So(users, ShouldHaveLength, 2)
		}

		{
			users := new([]interface{})
			e := mockDAO.Search(&service.Query{Offset: 4, Limit: 10}, users)
			So(e, ShouldBeNil)
			So(users, ShouldHaveLength, 1)
		}

		{
			u, e := mockDAO.Bind("username", "xxxxxxx")
			So(e, ShouldBeNil)
			So(u, ShouldNotBeNil)
		}

		{
			u, e := mockDAO.Bind("usernameXX", "xxxxxxx")
			So(u, ShouldBeNil)
			So(e, ShouldNotBeNil)
			So(errors.Parse(e.Error()).Code, ShouldEqual, 404)
		}

		{
			u, e := mockDAO.Bind("username", "xxxxxxxYY")
			So(u, ShouldBeNil)
			So(e, ShouldNotBeNil)
			So(errors.Parse(e.Error()).Code, ShouldEqual, 403)
		}

		{
			users := new([]interface{})
			userQuery := &idm.UserSingleQuery{
				Login: "user1",
			}
			userQueryAny, _ := ptypes.MarshalAny(userQuery)

			e := mockDAO.Search(&service.Query{SubQueries: []*any.Any{userQueryAny}}, users)
			So(e, ShouldBeNil)
			So(users, ShouldHaveLength, 0)
		}

		{
			users := new([]interface{})
			userQuery := &idm.UserSingleQuery{
				Login: "username",
			}
			userQueryAny, _ := ptypes.MarshalAny(userQuery)

			e := mockDAO.Search(&service.Query{SubQueries: []*any.Any{userQueryAny}}, users)
			So(e, ShouldBeNil)
			So(users, ShouldHaveLength, 1)
		}

		{
			users := new([]interface{})
			userQuery := &idm.UserSingleQuery{
				Login:    "username",
				NodeType: idm.NodeType_USER,
			}
			userQueryAny, _ := ptypes.MarshalAny(userQuery)

			e := mockDAO.Search(&service.Query{SubQueries: []*any.Any{userQueryAny}}, users)
			So(e, ShouldBeNil)
			So(users, ShouldHaveLength, 1)
		}

		{
			users := new([]interface{})
			userQuery := &idm.UserSingleQuery{
				Login:    "username",
				NodeType: idm.NodeType_GROUP,
			}
			userQueryAny, _ := ptypes.MarshalAny(userQuery)

			e := mockDAO.Search(&service.Query{SubQueries: []*any.Any{userQueryAny}}, users)
			So(e, ShouldBeNil)
			So(users, ShouldHaveLength, 0)
		}

		{
			users := new([]interface{})
			userQuery := &idm.UserSingleQuery{
				GroupPath: "/path/to/group",
			}
			userQueryAny, _ := ptypes.MarshalAny(userQuery)

			e := mockDAO.Search(&service.Query{SubQueries: []*any.Any{userQueryAny}}, users)
			So(e, ShouldBeNil)
			So(users, ShouldHaveLength, 1)
		}

		_, _, err2 := mockDAO.Add(&idm.User{
			IsGroup:   true,
			GroupPath: "/path/to/anotherGroup",
			Attributes: map[string]string{
				"displayName": "Group Display Name",
			},
		})

		So(err2, ShouldBeNil)

		{
			users := new([]interface{})
			userQuery := &idm.UserSingleQuery{
				FullPath: "/path/to/group",
			}
			userQueryAny, _ := ptypes.MarshalAny(userQuery)

			e := mockDAO.Search(&service.Query{SubQueries: []*any.Any{userQueryAny}}, users)
			So(e, ShouldBeNil)
			So(users, ShouldHaveLength, 1)
			object := (*users)[0]
			group, ok := object.(*idm.User)
			So(ok, ShouldBeTrue)
			So(group.GroupLabel, ShouldEqual, "group")
			So(group.GroupPath, ShouldEqual, "/path/to/")
			So(group.IsGroup, ShouldBeTrue)

		}

		{
			users := new([]interface{})
			userQuery := &idm.UserSingleQuery{
				FullPath: "/path/to/anotherGroup",
			}
			userQueryAny, _ := ptypes.MarshalAny(userQuery)

			e := mockDAO.Search(&service.Query{SubQueries: []*any.Any{userQueryAny}}, users)
			So(e, ShouldBeNil)
			So(users, ShouldHaveLength, 1)
			object := (*users)[0]
			group, ok := object.(*idm.User)
			So(ok, ShouldBeTrue)
			So(group.GroupLabel, ShouldEqual, "anotherGroup")
			So(group.GroupPath, ShouldEqual, "/path/to/")
			So(group.IsGroup, ShouldBeTrue)
			So(group.Attributes, ShouldResemble, map[string]string{"displayName": "Group Display Name"})

		}

		{
			users := new([]interface{})
			userQuery := &idm.UserSingleQuery{
				AttributeName:  "displayName",
				AttributeValue: "John*",
			}
			userQueryAny, _ := ptypes.MarshalAny(userQuery)
			userQuery2 := &idm.UserSingleQuery{
				AttributeName:  "active",
				AttributeValue: "true",
			}
			userQueryAny2, _ := ptypes.MarshalAny(userQuery2)
			userQuery3 := &idm.UserSingleQuery{
				AttributeName:  "hidden",
				AttributeValue: "false",
			}
			userQueryAny3, _ := ptypes.MarshalAny(userQuery3)

			total, e1 := mockDAO.Count(&service.Query{
				SubQueries: []*any.Any{
					userQueryAny,
					userQueryAny2,
					userQueryAny3,
				},
				Operation: service.OperationType_AND,
			})
			So(e1, ShouldBeNil)
			So(total, ShouldEqual, 1)

			e := mockDAO.Search(&service.Query{
				SubQueries: []*any.Any{
					userQueryAny,
					userQueryAny2,
					userQueryAny3,
				},
				Operation: service.OperationType_AND,
			}, users)
			So(e, ShouldBeNil)
			So(users, ShouldHaveLength, 1)
		}

		_, _, err3 := mockDAO.Add(&idm.User{
			Login:     "admin",
			Password:  "xxxxxxx",
			GroupPath: "/path/to/group",
			Attributes: map[string]string{
				"displayName": "Administrator",
				"hidden":      "false",
				"active":      "true",
			},
			Roles: []*idm.Role{
				{Uuid: "1", Label: "Role1"},
				{Uuid: "4", Label: "Role4"},
			},
		})

		So(err3, ShouldBeNil)

		{
			users := new([]interface{})
			userQuery := &idm.UserSingleQuery{
				HasRole: "1",
			}
			userQueryAny, _ := ptypes.MarshalAny(userQuery)

			e := mockDAO.Search(&service.Query{SubQueries: []*any.Any{userQueryAny}}, users)
			So(e, ShouldBeNil)
			So(users, ShouldHaveLength, 2)

			total, e2 := mockDAO.Count(&service.Query{SubQueries: []*any.Any{userQueryAny}})
			So(e2, ShouldBeNil)
			So(total, ShouldEqual, 2)

		}

		{
			users := new([]interface{})
			userQuery := &idm.UserSingleQuery{
				HasRole: "1",
			}
			userQueryAny, _ := ptypes.MarshalAny(userQuery)

			userQuery2 := &idm.UserSingleQuery{
				HasRole: "2",
				Not:     true,
			}
			userQueryAny2, _ := ptypes.MarshalAny(userQuery2)

			e := mockDAO.Search(&service.Query{
				SubQueries: []*any.Any{
					userQueryAny,
					userQueryAny2,
				},
				Operation: service.OperationType_AND,
			}, users)
			So(e, ShouldBeNil)
			So(users, ShouldHaveLength, 1)
			for _, user := range *users {
				So((user.(*idm.User)).Login, ShouldEqual, "admin")
				break
			}

		}

		{
			users := new([]interface{})
			userQueryAny, _ := ptypes.MarshalAny(&idm.UserSingleQuery{
				GroupPath: "/",
				Recursive: true,
			})
			e := mockDAO.Search(&service.Query{
				SubQueries: []*any.Any{userQueryAny},
			}, users)
			So(e, ShouldBeNil)
			So(users, ShouldHaveLength, 6)
			log.Print(users)
			allGroups := []*idm.User{}
			allUsers := []*idm.User{}
			for _, u := range *users {
				obj := u.(*idm.User)
				if obj.IsGroup {
					allGroups = append(allGroups, obj)
				} else {
					allUsers = append(allUsers, obj)
				}
			}
			So(allGroups, ShouldHaveLength, 4)
			So(allUsers, ShouldHaveLength, 2)
		}

		{
			users := new([]interface{})
			userQuery := &idm.UserSingleQuery{
				Login: "username",
			}
			userQueryAny, _ := ptypes.MarshalAny(userQuery)
			mockDAO.Search(&service.Query{SubQueries: []*any.Any{userQueryAny}}, users)
			u := (*users)[0].(*idm.User)
			So(u, ShouldNotBeNil)
			// Change groupPath
			So(u.GroupPath, ShouldEqual, "/path/to/group/")
			// Move User
			u.GroupPath = "/path/to/anotherGroup"
			addedUser, _, e := mockDAO.Add(u)
			So(e, ShouldBeNil)
			So(addedUser.(*idm.User).GroupPath, ShouldEqual, "/path/to/anotherGroup")
			So(addedUser.(*idm.User).Login, ShouldEqual, "username")

			users2 := new([]interface{})
			userQueryAny2, _ := ptypes.MarshalAny(&idm.UserSingleQuery{
				GroupPath: "/path/to/anotherGroup",
			})
			e2 := mockDAO.Search(&service.Query{
				SubQueries: []*any.Any{userQueryAny2},
			}, users2)
			So(e2, ShouldBeNil)
			So(users2, ShouldHaveLength, 1)

			users3 := new([]interface{})
			userQueryAny3, _ := ptypes.MarshalAny(&idm.UserSingleQuery{
				GroupPath: "/path/to/group",
			})
			e3 := mockDAO.Search(&service.Query{
				SubQueries: []*any.Any{userQueryAny3},
			}, users3)
			So(e3, ShouldBeNil)
			So(users3, ShouldHaveLength, 1)

		}

		{
			users := new([]interface{})
			userQuery := &idm.UserSingleQuery{
				FullPath: "/path/to/anotherGroup",
			}
			userQueryAny, _ := ptypes.MarshalAny(userQuery)
			mockDAO.Search(&service.Query{SubQueries: []*any.Any{userQueryAny}}, users)
			u := (*users)[0].(*idm.User)
			So(u, ShouldNotBeNil)
			// Change groupPath
			So(u.IsGroup, ShouldBeTrue)
			// Move Group
			u.GroupPath = "/anotherGroup"
			addedGroup, _, e := mockDAO.Add(u)
			So(e, ShouldBeNil)
			So(addedGroup.(*idm.User).GroupPath, ShouldEqual, "/anotherGroup")

			users2 := new([]interface{})
			userQueryAny2, _ := ptypes.MarshalAny(&idm.UserSingleQuery{
				GroupPath: "/path/to/anotherGroup",
			})
			e2 := mockDAO.Search(&service.Query{
				SubQueries: []*any.Any{userQueryAny2},
			}, users2)
			So(e2, ShouldBeNil)
			So(users2, ShouldHaveLength, 0)

			users3 := new([]interface{})
			userQueryAny3, _ := ptypes.MarshalAny(&idm.UserSingleQuery{
				GroupPath: "/anotherGroup",
			})
			e3 := mockDAO.Search(&service.Query{
				SubQueries: []*any.Any{userQueryAny3},
			}, users3)
			So(e3, ShouldBeNil)
			So(users3, ShouldHaveLength, 1)

		}

		{
			users := new([]interface{})
			userQuery := &idm.UserSingleQuery{
				GroupPath: "/",
				Recursive: false,
			}
			userQueryAny, _ := ptypes.MarshalAny(userQuery)

			e := mockDAO.Search(&service.Query{SubQueries: []*any.Any{userQueryAny}}, users)
			So(e, ShouldBeNil)
			for _, u := range *users {
				log.Print(u)
			}
			So(users, ShouldHaveLength, 3)
		}

		{
			// Delete a group
			userQueryAny3, _ := ptypes.MarshalAny(&idm.UserSingleQuery{
				GroupPath: "/anotherGroup",
			})
			num, e3 := mockDAO.Del(&service.Query{SubQueries: []*any.Any{userQueryAny3}})
			So(e3, ShouldBeNil)
			So(num, ShouldEqual, 2)
		}

		{
			// Delete all should be prevented
			_, e3 := mockDAO.Del(&service.Query{})
			So(e3, ShouldNotBeNil)
		}

		{
			// Delete a user
			userQueryAny3, _ := ptypes.MarshalAny(&idm.UserSingleQuery{
				GroupPath: "/path/to/group/",
				Login:     "admin",
			})
			num, e3 := mockDAO.Del(&service.Query{SubQueries: []*any.Any{userQueryAny3}})
			So(e3, ShouldBeNil)
			So(num, ShouldEqual, 1)
		}

	})

	Convey("Query Builder W/ subquery", t, func() {

		singleQ1, singleQ2, singleQ3 := new(idm.UserSingleQuery), new(idm.UserSingleQuery), new(idm.UserSingleQuery)

		singleQ1.Login = "user1"
		singleQ2.Login = "user2"
		singleQ3.Login = "user3"

		singleQ1Any, err := ptypes.MarshalAny(singleQ1)
		So(err, ShouldBeNil)

		singleQ2Any, err := ptypes.MarshalAny(singleQ2)
		So(err, ShouldBeNil)

		singleQ3Any, err := ptypes.MarshalAny(singleQ3)
		So(err, ShouldBeNil)

		subQuery1 := &service.Query{
			SubQueries: []*any.Any{singleQ1Any, singleQ2Any},
			Operation:  service.OperationType_OR,
		}

		subQuery2 := &service.Query{
			SubQueries: []*any.Any{singleQ3Any},
		}

		subQuery1Any, err := ptypes.MarshalAny(subQuery1)
		So(err, ShouldBeNil)
		test := ptypes.Is(subQuery1Any, new(service.Query))
		So(test, ShouldBeTrue)

		subQuery2Any, err := ptypes.MarshalAny(subQuery2)
		So(err, ShouldBeNil)

		composedQuery := &service.Query{
			SubQueries: []*any.Any{
				subQuery1Any,
				subQuery2Any,
			},
			Offset:    0,
			Limit:     10,
			Operation: service.OperationType_AND,
		}

		s := sql.NewQueryBuilder(composedQuery, converter).Expression("sqlite")
		So(s, ShouldNotBeNil)
		//So(s, ShouldEqual, "((t.uuid = n.uuid and (n.name='user1' and n.leaf = 1)) OR (t.uuid = n.uuid and (n.name='user2' and n.leaf = 1))) AND (t.uuid = n.uuid and (n.name='user3' and n.leaf = 1))")
	})
}
