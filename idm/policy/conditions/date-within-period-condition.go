/*
 * Copyright (c) 2018. Abstrium SAS <team (at) pydio.com>
 * This file is part of Pydio Cells.
 *
 * Pydio Cells is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Pydio Cells is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with Pydio Cells.  If not, see <http://www.gnu.org/licenses/>.
 *
 * The latest code can be found at <https://pydio.com>.
 */

package conditions

import (
	"context"
	"time"

	"github.com/ory/ladon"
	"go.uber.org/zap"

	"github.com/pmker/yux/common/log"
)

// DateWithinPeriodCondition is a condition which is fulfilled if the
// server current date time between start date and end date
type DateWithinPeriodCondition struct {
	DateBegin string `json:"dateBegin"`
	DateEnd   string `json:"dateEnd"`
}

// Fulfills returns true if the given value is a Time and is between start and end date.
// It expects a string formatted this way: "2006-01-02T15:04-0700"
func (c *DateWithinPeriodCondition) Fulfills(value interface{}, _ *ladon.Request) bool {

	s, ok := value.(string)
	if !ok {
		log.Logger(context.Background()).Error("passed value must be a string", zap.Any("input param", value))
		return false
	}

	// log.Logger(context.Background()).Error("checking time period condition for date: " + s)

	t, parseErr := time.Parse(timeLayout, s)
	if parseErr != nil {
		log.Logger(context.Background()).Error("cannot parse passed value. reference layout is "+timeLayout, zap.String("input param", s), zap.Error(parseErr))
		return false
	}

	// We assume date format has been checked upon creation
	dateBegin, _ := time.Parse(timeLayout, c.DateBegin)
	dateEnd, _ := time.Parse(timeLayout, c.DateEnd)

	return dateBegin.Before(t) && dateEnd.After(t)
}

// GetName returns the condition's name.
func (c *DateWithinPeriodCondition) GetName() string {
	return "DateWithinPeriodCondition"
}
