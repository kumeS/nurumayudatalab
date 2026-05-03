import zipfile
from xml.etree import ElementTree as ET

XDR = "http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing"
A_NS = "http://schemas.openxmlformats.org/drawingml/2006/main"
R_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"

with zipfile.ZipFile('WJFT6705-00017.xlsx', 'r') as z:
    rels_xml = z.read('xl/drawings/_rels/drawing1.xml.rels').decode('utf-8')
    print('=== Drawing Rels ===')
    root = ET.fromstring(rels_xml)
    for r in root:
        rid = r.attrib.get('Id', '')
        target = r.attrib.get('Target', '')
        print(f'  {rid} -> {target}')

    draw_xml = z.read('xl/drawings/drawing1.xml').decode('utf-8')
    root = ET.fromstring(draw_xml)

    print('\n=== Image Anchors ===')
    for tag in ['oneCellAnchor', 'twoCellAnchor']:
        for anchor in root.findall(f'{{{XDR}}}{tag}'):
            fr = anchor.find(f'{{{XDR}}}from')
            if fr is not None:
                row_el = fr.find(f'{{{XDR}}}row')
                col_el = fr.find(f'{{{XDR}}}col')
                row = row_el.text if row_el is not None else '?'
                col = col_el.text if col_el is not None else '?'
            else:
                row, col = '?', '?'

            blip = anchor.find(f'.//{{{A_NS}}}blip')
            embed = ''
            if blip is not None:
                embed = blip.get(f'{{{R_NS}}}embed', '')

            print(f'  {tag}: row={row}, col={col}, embed={embed}')
