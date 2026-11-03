"""Rebuild AvronAtlas Windows EXE from source. Requires Go 1.23+ and Python 3.
Run from project root: python launcher-source/rebuild_exe.py
"""
import os
from pathlib import Path
import shutil
import subprocess
root=Path(__file__).resolve().parent.parent
launch=root/'launcher-source'
static=launch/'static'
if static.exists():
    raise SystemExit('Уберите временную папку launcher-source/static перед повторной сборкой')
static.mkdir()
try:
    for item in root.iterdir():
        if item.name=='launcher-source': continue
        dst=static/item.name
        if item.is_dir(): shutil.copytree(item,dst,copy_function=shutil.copy2)
        elif item.is_file():shutil.copy2(item,dst)
    env=dict(os.environ,GOOS='windows',GOARCH='amd64',CGO_ENABLED='0')
    output=root.parent/'AvronAtlas_Windows_Rebuilt.exe'
    subprocess.run(['go','build','-trimpath','-ldflags=-s -w -H=windowsgui','-o',str(output),'.'],cwd=launch,env=env,check=True)
    print('Готово:', output)
finally:
    shutil.rmtree(static)
