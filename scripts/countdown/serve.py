"""Read-only loopback fixtures; no API routing, secrets, or production data."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
root=Path(__file__).resolve().parents[2]
class Handler(BaseHTTPRequestHandler):
 def log_message(self,*args): pass
 def do_GET(self):
  path=self.path.split('?')[0]
  if path=='/observer.js': file=root/'scripts/readiness/observer.js'
  elif path=='/matrix.html': file=root/'scripts/readiness/matrix.html'
  elif path.startswith('/before/'): file=Path('/private/tmp/cdawg-audio-baseline/tmp/readiness/harness')/path.removeprefix('/before/')
  elif path.startswith('/lobby/'): file=(root/'tmp/lobby-integration/harness')/path.removeprefix('/lobby/')
  else: file=root/'tmp/readiness/harness'/path.lstrip('/')
  if not file.is_file() or not (file in [root/'scripts/readiness/observer.js',root/'scripts/readiness/matrix.html'] or any(file.resolve().is_relative_to(base) for base in [root/'tmp/readiness/harness',(root/'tmp/lobby-integration/harness'),Path('/private/tmp/cdawg-audio-baseline/tmp/readiness/harness')])): self.send_error(404);return
  self.send_response(200);self.send_header('Content-Type',{'html':'text/html','js':'application/javascript','css':'text/css','webp':'image/webp','svg':'image/svg+xml','woff2':'font/woff2'}.get(file.suffix[1:],'application/octet-stream'));self.send_header('Cache-Control','public,max-age=3600' if '/assets/' in path else 'no-store');self.end_headers()
  try: self.wfile.write(file.read_bytes())
  except (BrokenPipeError,ConnectionResetError): pass
 def do_POST(self):
  if self.path!='/evidence': self.send_error(404);return
  length=int(self.headers.get('Content-Length',0))
  if length>2000000:self.send_error(413);return
  (root/'tmp/audio-readiness/renderer-matrix.json').write_bytes(self.rfile.read(length));self.send_response(204);self.end_headers()
ThreadingHTTPServer(('127.0.0.1',5231),Handler).serve_forever()
