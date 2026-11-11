"""Extract cached workbook values without modifying the workbook.

Summary/formula tabs are retained for provenance, never counted as transactions.
"""
import datetime
import hashlib
import json
import math
import sys
import warnings
from pathlib import Path

import openpyxl

warnings.filterwarnings('ignore', category=UserWarning, module='openpyxl')
source = Path(sys.argv[1])
values = openpyxl.load_workbook(source, data_only=True)
formulas = openpyxl.load_workbook(source, data_only=False)

def encode(value):
    if isinstance(value, (datetime.datetime, datetime.date)):
        return value.isoformat()
    return value

def number(value, sheet, row, integer=False):
    if value is None or value == '-' or value == '':
        return None
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        raise ValueError(f'{sheet} row {row}: invalid numeric value {value!r}')
    if integer and (value < 0 or value != int(value)):
        raise ValueError(f'{sheet} row {row}: invalid count')
    return int(value) if integer else str(value)

result = {'fileName': source.name, 'sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
          'collections': [], 'expenses': [], 'staff': [], 'cities': [], 'sourceRows': [], 'excludedRows': []}
for sheet in values:
    for row in sheet:
        cells = {cell.column_letter: encode(cell.value) for cell in row if cell.value is not None}
        if cells:
            formula_cells = {cell.coordinate: cell.value for cell in formulas[sheet.title][row[0].row] if cell.data_type == 'f'}
            result['sourceRows'].append({'sheet': sheet.title, 'row': row[0].row, 'values': cells, 'formulas': formula_cells})

for row in list(values['Dim_City'].values)[1:]:
    if row[0]:
        result['cities'].append({'name': str(row[0]).strip(), 'province': row[1], 'latitude': row[2], 'longitude': row[3]})

for sheet_name in ['Public_Collection', 'Branch_Collection', 'Public_Expense', 'Public_Staff']:
    seen = set()
    for row_no, row in enumerate(values[sheet_name].values, 1):
        if row_no == 1 or not any(v is not None for v in row[:8]):
            continue
        if not isinstance(row[0], datetime.datetime):
            result['excludedRows'].append({'sheet': sheet_name, 'row': row_no, 'reason': 'Undated summary row; retained in source archive'})
            continue
        staff = sheet_name == 'Public_Staff'
        city = str(row[4 if staff else 5] or '').strip()
        if not city or row[0].day != 1 or int(row[1]) != row[0].year:
            raise ValueError(f'{sheet_name} row {row_no}: invalid month or city')
        if not staff and int(row[2]) != row[0].month:
            raise ValueError(f'{sheet_name} row {row_no}: inconsistent month')
        base = {'sourceSheet': sheet_name.lower(), 'sourceRow': row_no, 'sourceCityName': city,
                'month': row[0].strftime('%Y-%m-01')}
        key = (base['month'], city.lower(), str(row[6]) if sheet_name == 'Public_Expense' else '')
        if key in seen:
            raise ValueError(f'{sheet_name} row {row_no}: duplicate city/month/category')
        seen.add(key)
        if staff:
            result['staff'].append({**base, 'count': number(row[5], sheet_name, row_no, True)})
        elif sheet_name == 'Public_Expense':
            result['expenses'].append({**base, 'category': str(row[6]).strip(), 'amount': number(row[7], sheet_name, row_no),
                                       'valueState': 'missing' if row[7] is None else 'dash' if row[7] == '-' else 'reported'})
        else:
            result['collections'].append({**base, 'channel': 'public' if sheet_name == 'Public_Collection' else 'branch',
                                          'boxes': number(row[6], sheet_name, row_no, True), 'amount': number(row[7], sheet_name, row_no),
                                          'target': number(row[8], sheet_name, row_no) if sheet_name == 'Branch_Collection' else None,
                                          'valueState': 'missing' if row[7] is None else 'reported'})
Path(sys.argv[2]).write_text(json.dumps(result, ensure_ascii=False), encoding='utf-8')
print(json.dumps({'sheets': len(values.sheetnames), 'collections': len(result['collections']), 'expenses': len(result['expenses']),
                  'staff': len(result['staff']), 'excludedRows': result['excludedRows']}))
