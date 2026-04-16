"""
Static file server with no-cache headers.
Prevents Cloudflare and browsers from caching assets.
"""
import os
from http.server import HTTPServer, SimpleHTTPRequestHandler

class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        super().end_headers()

    def log_message(self, *args):
        pass  # silence access logs

os.chdir('/home/xubuntu/nicolasbiondi/landing')
HTTPServer(('0.0.0.0', 8888), NoCacheHandler).serve_forever()
