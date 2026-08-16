package main

import (
	"os/exec"
	"runtime"
	"strings"
)

func openExternal(link string) {
	if !strings.HasPrefix(link, "https://") && !strings.HasPrefix(link, "http://") {
		return
	}
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		cmd = exec.Command("rundll32", "url.dll,FileProtocolHandler", link)
	case "darwin":
		cmd = exec.Command("open", link)
	default:
		cmd = exec.Command("xdg-open", link)
	}
	_ = cmd.Start()
}
