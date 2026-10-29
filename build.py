#!/usr/bin/env python3
"""Inline src/ into one self-contained page: dist/power-presence.html"""
import pathlib
root = pathlib.Path(__file__).parent / "src"
shell = (root / "shell.html").read_text()
css = (root / "style.css").read_text()
js = "\n".join(p.read_text() for p in sorted((root / "data").glob("*.js")))
js += "\n" + (root / "js" / "app.js").read_text()
out = shell.replace("/*__CSS__*/", css).replace("/*__JS__*/", js.replace("</script", "<\\/script"))
dist = pathlib.Path(__file__).parent / "dist"
dist.mkdir(exist_ok=True)
(dist / "power-presence.html").write_text(out)
print("wrote", len(out.encode()), "bytes")
