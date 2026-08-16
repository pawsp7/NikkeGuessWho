package main

import (
	"embed"
	"io/fs"
	"log"
	"net"
	"net/http"
	"os"
	"time"
)

//go:embed all:web
var webFS embed.FS

func main() {
	sub, err := fs.Sub(webFS, "web")
	if err != nil {
		log.Fatal(err)
	}

	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		log.Fatal(err)
	}

	server := &http.Server{
		Handler:           http.FileServer(http.FS(sub)),
		ReadHeaderTimeout: 5 * time.Second,
	}
	go func() {
		if serveErr := server.Serve(listener); serveErr != nil && serveErr != http.ErrServerClosed {
			log.Print(serveErr)
			os.Exit(1)
		}
	}()

	url := "http://" + listener.Addr().String() + "/"
	startUI(url)
}
