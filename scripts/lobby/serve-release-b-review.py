"""Loopback-only review: untouched production candidate inside test viewport wrapper."""
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
import mimetypes,sys,re
root=Path(__file__).resolve().parents[2]
class Handler(BaseHTTPRequestHandler):
 def log_message(self,*args):pass
 def do_GET(self):
  path=self.path.split('?')[0].lstrip('/')
  if path in ('','candidate.html'):file=root/'dist/index.html'
  elif path=='review.html':file=root/'tmp/lobby-integration/harness/responsive.html'
  elif re.fullmatch(r'assets/[A-Za-z0-9_-]+\.(?:js|css|webp|svg|woff2)',path):
   file=root/'dist'/path
   if not file.is_file():file=root/'tmp/lobby-integration/harness'/path
  else:self.send_error(404);return
  if not file.is_file() or not file.resolve().is_relative_to(root):self.send_error(404);return
  self.send_response(200);self.send_header('Content-Type',mimetypes.guess_type(file.name)[0] or 'application/octet-stream');self.send_header('Cache-Control','public,max-age=31536000,immutable' if path.startswith('assets/') else 'no-cache');self.end_headers();self.wfile.write(file.read_bytes())
ThreadingHTTPServer(('127.0.0.1',int(sys.argv[1]) if len(sys.argv)>1 else 5218),Handler).serve_forever()
