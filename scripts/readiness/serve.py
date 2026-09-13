"""Loopback-only diagnostic server. No production APIs or identity/session data."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json, sys
root=Path(__file__).resolve().parents[2]
class Handler(BaseHTTPRequestHandler):
 def log_message(self,*args): pass
 def do_GET(self):
  name=self.path.split('?')[0].lstrip('/')
  if name in ['', 'matrix.html']: file=root/'scripts/readiness/matrix.html'
  elif name=='observer.js': file=root/'scripts/readiness/observer.js'
  else: file=root/'tmp/readiness/harness'/name
  if not file.is_file() or not file.resolve().is_relative_to(root): self.send_error(404);return
  self.send_response(200);self.send_header('Content-Type',{'html':'text/html','js':'application/javascript','css':'text/css','webp':'image/webp'}.get(file.suffix[1:],'application/octet-stream'));self.send_header('Cache-Control','public,max-age=3600' if name.startswith('assets/') else 'no-store');self.end_headers();self.wfile.write(file.read_bytes())
 def do_POST(self):
  if self.path!='/evidence':self.send_error(404);return
  length=int(self.headers.get('Content-Length',0))
  if length>2_000_000:self.send_error(413);return
  value=json.loads(self.rfile.read(length));(root/'tmp/readiness/browser.json').write_text(json.dumps(value,indent=2));self.send_response(204);self.end_headers()
ThreadingHTTPServer(('127.0.0.1',int(sys.argv[1]) if len(sys.argv)>1 else 5206),Handler).serve_forever()
