"""
Redirect server: www.nicolasbiondi.com → https://nicolasbiondi.com
Runs on port 8889, cloudflared routes www to this.
"""
from http.server import HTTPServer, BaseHTTPRequestHandler

class RedirectHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        target = 'https://nicolasbiondi.com' + self.path
        self.send_response(301)
        self.send_header('Location', target)
        self.end_headers()

    do_HEAD = do_GET
    do_POST = do_GET

    def log_message(self, *args):
        pass  # silence logs

if __name__ == '__main__':
    HTTPServer(('0.0.0.0', 8889), RedirectHandler).serve_forever()
