//go:build windows

package main

import (
	"os/exec"

	"github.com/jchv/go-webview2"
)

func startUI(url string) {
	view := webview2.NewWithOptions(webview2.WebViewOptions{
		Debug:     false,
		AutoFocus: true,
		WindowOptions: webview2.WindowOptions{
			Title:  "Guess Who: Nikke Edition",
			Width:  1180,
			Height: 820,
			Center: true,
		},
	})
	if view == nil {
		_ = exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
		select {}
	}
	defer view.Destroy()
	view.SetSize(1180, 820, webview2.HintMin)
	view.Navigate(url)
	view.Run()
}
