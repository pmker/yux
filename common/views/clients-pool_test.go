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

package views

import (
	"fmt"
	"os"
	"os/exec"
	"testing"
	"time"
)

var pools []*ClientsPool

func BenchmarkClientsPoolWithoutRegistryWatch(b *testing.B) {

	go listOpenFiles()

	// run the Benchmark function b.N times
	for n := 0; n < b.N; n++ {
		pools = append(pools, NewClientsPool(false))
	}
}

func BenchmarkClientsPoolWithRegistryWatch(b *testing.B) {

	go listOpenFiles()

	// run the Benchmark function b.N times
	for n := 0; n < b.N; n++ {
		pools = append(pools, NewClientsPool(true))
	}
}

func listOpenFiles() {
	tick := time.Tick(10 * time.Millisecond)

	for {
		select {
		case <-tick:

			lsof := exec.Command("lsof", "-p", fmt.Sprintf("%d", os.Getpid()))
			wc := exec.Command("wc", "-l")
			outPipe, err := lsof.StdoutPipe()
			if err != nil {
				continue
			}
			lsof.Start()
			wc.Stdin = outPipe
			out, err := wc.Output()
			if err != nil {
				continue
			}

			fmt.Printf("Number of Open Files : %s\n", out)
		}
	}
}
