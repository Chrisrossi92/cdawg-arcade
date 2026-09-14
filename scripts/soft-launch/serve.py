"""Loopback-only review. Never serves credentials, repository internals or an API."""
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
import mimetypes
ROOT=Path(__file__).resolve().parents[2]
class Handler(BaseHTTPRequestHandler):
 def log_message(self,*args):pass
 def do_GET(self):
  path=self.path.split('?')[0]
  if path=='/review.html':base=ROOT/'scripts/soft-launch';relative='review.html'
  elif path.startswith('/brand/'):base=ROOT/'assets/brand/soft-launch/v001';relative=path[7:]
  elif path.startswith('/lobby/'):base=ROOT/'tmp/lobby-integration/harness';relative=path[7:]
  else:base=ROOT/'dist';relative=path.lstrip('/') or 'index.html'
  file=(base/relative).resolve()
  if not file.is_relative_to(base.resolve()) or not file.is_file():self.send_error(404);return
  self.send_response(200);self.send_header('Content-Type',mimetypes.guess_type(file.name)[0]or'application/octet-stream');self.end_headers();self.wfile.write(file.read_bytes())
ThreadingHTTPServer(('127.0.0.1',5254),Handler).serve_forever()
