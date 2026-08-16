package main

import (
	"io/fs"
	"testing"
)

func TestEmbeddedWebApp(t *testing.T) {
	entries := []string{
		"web/index.html",
		"web/js/game.js",
		"web/js/grid.js",
		"web/js/nikkes-data.js",
		"web/css/app.css",
		"web/ui/gwn_logo.png",
		"web/portraits/si_c470_00_s.webp",
	}
	for _, name := range entries {
		if _, err := fs.Stat(webFS, name); err != nil {
			t.Fatalf("missing embedded file %s: %v", name, err)
		}
	}
	data, err := fs.ReadFile(webFS, "web/js/nikkes-data.js")
	if err != nil {
		t.Fatal(err)
	}
	if len(data) < 1000 {
		t.Fatalf("nikkes-data.js is too small: %d bytes", len(data))
	}
}
