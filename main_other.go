//go:build !windows

package main

import (
	"fmt"
	"os"
	"os/exec"
	"os/signal"
	"runtime"
)

func startUI(url string) {
	fmt.Println("Guess Who: Nikke Edition")
	fmt.Println("Open this URL if the browser does not launch:")
	fmt.Println(url)

	var open *exec.Cmd
	switch runtime.GOOS {
	case "darwin":
		open = exec.Command("open", url)
	default:
		open = exec.Command("xdg-open", url)
	}
	_ = open.Start()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt)
	<-stop
}
