"""Refresh exact Hapgood chapter headings from the locally downloaded Gutenberg HTML.
Usage: python scripts/extract-chapter-titles.py /path/to/pg135-images.html
No network request is performed. Existing chapter anchors determine every match.
"""
import hashlib
import json
import re
import subprocess
import sys
from html.parser import HTMLParser
from pathlib import Path

class Headings(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.active = False
        self.anchor = None
        self.text = []
        self.headings = {}
        self.note = False
    def handle_starttag(self, tag, attrs):
        if tag == 'h3':
            self.active, self.anchor, self.text = True, None, []
        if self.active and tag == 'a':
            attrs = dict(attrs)
            anchor = attrs.get('id', attrs.get('name', ''))
            if anchor.startswith('link2HCH'):
                self.anchor = anchor
            self.note = attrs.get('href', '').startswith('#linknote')
    def handle_data(self, value):
        if self.active and not self.note:
            self.text.append(value)
    def handle_endtag(self, tag):
        if tag == 'a':
            self.note = False
        if tag == 'h3' and self.active:
            if self.anchor:
                if self.anchor in self.headings:
                    raise ValueError('Duplicate chapter anchor: ' + self.anchor)
                self.headings[self.anchor] = ' '.join(''.join(self.text).split())
            self.active = False

raw = Path(sys.argv[1]).read_bytes()
parser = Headings()
parser.feed(raw.decode('utf-8-sig'))
catalog = json.loads(subprocess.check_output(['node', '-e', "const fs=require('fs'),vm=require('vm'),c={window:{}};vm.runInNewContext(fs.readFileSync('dist/extras.js','utf8'),c);process.stdout.write(JSON.stringify(c.window.EXTRA_CONTENT.chapterCompanion.chapters))"]))
assert len(catalog) == 365
mapped = {}
for chapter in catalog:
    anchor = chapter['url'].split('#')[1]
    title = parser.headings[anchor]
    assert re.match(r'^CHAPTER [IVXLCDM]+(?:[—.]|$)', title), (anchor, title)
    mapped[chapter['id']] = {'anchor': anchor, 'title': title}
assert len(mapped) == 365
for part in range(1, 6):
    path = Path(f'dist/reading/part-{part}.json')
    data = json.loads(path.read_text())
    for chapter in data['chapters']:
        chapter['sourceTitle'] = mapped[chapter['id']]['title']
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
manifest = {'source': 'https://www.gutenberg.org/cache/epub/135/pg135-images.html', 'translator': 'Isabel F. Hapgood', 'language': 'en', 'retrieved': '2026-10-23', 'sourceSha256': hashlib.sha256(raw).hexdigest(), 'normalization': 'HTML entities decoded; whitespace collapsed; wording and capitalization unchanged', 'chapters': mapped}
Path('docs/chapter-title-sources.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
print('Verified and extracted 365 exact chapter headings from their existing source anchors.')
