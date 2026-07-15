#!/usr/bin/env python3
"""Build seed JSON for task_tracker from sheet CSV + April/May HTML reports."""
import csv, json, re, html as H
from datetime import datetime, timezone

SCRATCH = '/private/tmp/claude-501/-Users-syed-code-task-tracker/5292ced7-557c-41d5-b097-6e9de1f0b5fa/scratchpad'
REPORTS = f'{SCRATCH}/cro-reports'
OUT = '/Users/syed/code/task_tracker/scripts/real-data'

import os
os.makedirs(OUT, exist_ok=True)

# ---------- helpers ----------
def strip_tags(s):
    return H.unescape(re.sub(r'<[^>]+>', ' ', s)).replace('\xa0', ' ').strip()

def norm_ws(s):
    return re.sub(r'\s+', ' ', s).strip()

def parse_date(s):
    s = (s or '').strip()
    if not s: return None
    for fmt in ('%d-%b-%Y', '%d-%b-%y', '%d/%m/%Y'):
        try: return datetime.strptime(s, fmt).strftime('%Y-%m-%dT00:00:00.000Z')
        except ValueError: pass
    return None

PLATFORM_MAP = {
    'web - mobile': 'Web-Mobile', 'web-mobile': 'Web-Mobile', 'web -mobile': 'Web-Mobile',
    'web - desk': 'Web-Desk', 'web -desk': 'Web-Desk', 'web-desk': 'Web-Desk', 'web - desktop': 'Web-Desk',
    'app - android': 'App-Android', 'app-android': 'App-Android',
    'app - ios': 'App-iOS', 'app-ios': 'App-iOS',
}
def parse_platforms(s):
    out = []
    for part in (s or '').split(','):
        p = PLATFORM_MAP.get(part.strip().lower())
        if p and p not in out: out.append(p)
    return out

def tag_platforms(tags):
    out = []
    for t in tags:
        tl = t.lower()
        if tl == 'mobile' and 'Web-Mobile' not in out: out.append('Web-Mobile')
        if tl == 'desktop' and 'Web-Desk' not in out: out.append('Web-Desk')
    return out

def mk_title(row):
    page = norm_ws(row.get('Page + Location', ''))
    hypo = norm_ws(row.get('test hypothesis', '')) or norm_ws(row.get('Problem', ''))
    if hypo:
        cut = hypo[:60]
        cut = cut.rsplit(' ', 1)[0] if len(hypo) > 60 else cut
        t = (page.title() + ' — ' if page else '') + cut
    else:
        t = page.title() or row['Test ID']
    return t

# ---------- 1. sheet ----------
rows = list(csv.reader(open(f'{SCRATCH}/ideas.csv')))
hdr = [h.strip() for h in rows[2]]
sheet = []
for r in rows[3:]:
    d = dict(zip(hdr, [c.strip() for c in r]))
    if d.get('Test ID'): sheet.append(d)

STATUS_MAP = {'winner': ('Completed', 'Winner'), 'failure': ('Completed', 'Loser'),
              'in progress': ('Monitoring', 'In Progress'), '': ('Idea', 'In Progress')}

experiments = {}  # test_id -> exp
next_id = 1
for row in sheet:
    tid = row['Test ID']
    status, result = STATUS_MAP.get(row['status'].lower(), ('Idea', 'In Progress'))
    start = parse_date(row.get('start') or row.get(' start '))
    end = parse_date(row.get('end'))
    created = parse_date(row.get('entry')) or start or '2026-01-01T00:00:00.000Z'
    ice = None
    if row.get('ice score'):
        m = re.search(r'[\d.]+', row['ice score'])
        if m: ice = float(m.group())
    dur = None
    if start and end:
        dur = (datetime.fromisoformat(end.replace('Z','+00:00')) - datetime.fromisoformat(start.replace('Z','+00:00'))).days
    hist = [{'stage': 'Idea', 'entered_at': created, 'note': ''}]
    if status != 'Idea':
        hist.append({'stage': status, 'entered_at': start or created, 'note': ''})
    exp = {
        'id': next_id, 'test_id': tid, 'title': mk_title(row), 'status': status,
        'platform': parse_platforms(row.get('platform', '')),
        'pages': [norm_ws(row.get('Page + Location',''))] if row.get('Page + Location') else [],
        'hypothesis': row.get('test hypothesis', ''),
        'problem_statement': row.get('Problem', ''),
        'metrics': {'primary': row.get('success metrics', ''), 'secondary': [], 'guardrail': []},
        'result': result, 'ice_score': ice, 'sprint': row.get('Sprint') or None,
        'revenue_impact': row.get('Revenue generated') or None,
        'creator': row.get('Ideator', ''),
        'stage_history': hist,
        'results': {'exposure_event': '', 'variants': ['Control', 'Variant B'],
                    'exposures': [None, None], 'metrics': [],
                    'notes': row.get('results', '')},
        'start_date': start, 'end_date': end, 'duration_days': dur,
        'remarks': row.get('Remark', ''),
        'growthbook_id': '', 'amaly_task_id': '',
        'source': 'self', 'promoted_from_idea_id': None, 'created_at': created,
        'potential_outcome': row.get('potential outcome', ''),
    }
    experiments[tid] = exp
    next_id += 1

# ---------- 2. reports ----------
def parse_cards(fname):
    raw = open(f'{REPORTS}/{fname}').read()
    parts = raw.split('<div class="exp-card">')[1:]
    cards = []
    for p in parts:
        name_m = re.search(r'exp-name">(.*?)</div>', p, re.S)
        hypo_m = re.search(r'exp-hypo">(.*?)</div>', p, re.S)
        name = norm_ws(strip_tags(name_m.group(1))) if name_m else ''
        name = re.sub(r'^\d+\.\s*', '', name)
        hypo = norm_ws(strip_tags(hypo_m.group(1))) if hypo_m else ''
        tags = [norm_ws(strip_tags(t)) for t in re.findall(r'class="tag">(.*?)</span>', p, re.S)]
        pill_m = re.search(r'status-pill pill-(\w+)[^>]*>(.*?)</', p, re.S)
        pill_cls = pill_m.group(1) if pill_m else ''
        pill_txt = norm_ws(strip_tags(pill_m.group(2))) if pill_m else ''
        # results tables -> matrix (first table only, best effort)
        matrix = None
        t_m = re.search(r'<table class="results-table">(.*?)</table>', p, re.S)
        if t_m:
            tbl = t_m.group(1)
            heads = [norm_ws(strip_tags(h)) for h in re.findall(r'<th[^>]*>(.*?)</th>', tbl, re.S)]
            body_rows = []
            for tr in re.findall(r'<tr>(.*?)</tr>', tbl, re.S):
                cells = [norm_ws(strip_tags(c)) for c in re.findall(r'<td[^>]*>(.*?)</td>', tbl and tr, re.S)]
                if cells: body_rows.append(cells)
            if heads and body_rows:
                matrix = {'heads': heads, 'rows': body_rows}
        # insights text
        insights = [norm_ws(strip_tags(i)) for i in re.findall(r'insight-body">(.*?)</div>', p, re.S)]
        # explicit TEST-ID in name
        tid_m = re.search(r'TEST-(\d+)', name)
        cards.append({'name': name, 'hypo': hypo, 'tags': tags, 'pill_cls': pill_cls,
                      'pill_txt': pill_txt, 'matrix': matrix, 'insights': insights,
                      'report_tid': f'TEST-{tid_m.group(1)}' if tid_m else None})
    return cards

april = parse_cards('april_report.html')
may = parse_cards('index.html')

def norm_title(n):
    n = re.sub(r'^TEST-\d+:\s*', '', n).lower()
    return re.sub(r'[^a-z0-9]+', '', n)

# dedupe: may wins over april for same normalized title (or same report_tid)
def key(c):
    return c['report_tid'] or norm_title(c['name'])

merged = {}
for c in april:
    c['months'] = ['April']
    merged[key(c)] = c
# known cross-month same-test aliases (title drift between reports)
ALIAS = {
    norm_title('ATC button Interaction change (English vs Bangla)'): norm_title('Superstore — ATC button label (English vs Bangla)'),
    norm_title('Checkout — Order Summary Dropdown & Redesign'): 'TEST-053',  # april queue id
    norm_title('QuickDeal Badge — Related Product Section'): norm_title('QuickDeal badge — related products section'),
}
for c in may:
    k = key(c)
    k = ALIAS.get(k, k)
    if k in merged:
        prev = merged[k]
        c['months'] = prev['months'] + ['May']
        c['april_pill'] = prev['pill_txt']
        c['april_matrix'] = prev['matrix']
        c['april_insights'] = prev['insights']
        if not c['hypo']: c['hypo'] = prev['hypo']
        merged[k] = c
    else:
        c['months'] = ['May']
        merged[k] = c

# ---------- 3. map report cards to app experiments ----------
# high-confidence manual matches: report card key -> sheet TEST-ID
MANUAL = {
    norm_title('Extra-discount books — navigation visibility'): 'TEST-001',
    'TEST-020': 'TEST-049',  # promo code to cart page
}

def pill_to_state(cls, txt):
    """deep-dive pill -> (status, result)"""
    t = txt.lower()
    if '✗' in txt or 'lost' in t or 'negative' in t: return ('Completed', 'Loser')
    if cls == 'ship': return ('Completed', 'Winner')
    if cls == 'iterate': return ('Completed', 'Inconclusive')
    if cls == 'scale': return ('Completed', 'Winner')
    if cls == 'extend': return ('Live', 'In Progress')
    if cls == 'inconclusive': return ('Monitoring', 'Inconclusive')
    return ('Completed', 'Inconclusive')

def queue_pill_to_stage(txt):
    t = txt.lower()
    if 'qa' in t: return 'SQA'
    if 'code review' in t: return 'Code Review'
    if 'not live' in t or 'pending' in t: return 'Merge'
    return 'Implementation'  # blocked / re-implement

def matrix_to_results(matrix, notes):
    res = {'exposure_event': '', 'variants': ['Control', 'Variant B'],
           'exposures': [None, None], 'metrics': [], 'notes': notes}
    if not matrix: return res
    heads, rows_ = matrix['heads'], matrix['rows']
    variants = heads[1:]
    if not variants: return res
    res['variants'] = variants
    res['exposures'] = [None] * len(variants)
    def num(s):
        m = re.search(r'[\d,]+(?:\.\d+)?', s.replace(',', ''))
        return float(m.group()) if m else None
    metrics = []
    for r in rows_:
        if len(r) < 2: continue
        mname = r[0]
        vals = [num(v) for v in r[1:len(variants)+1]]
        if re.search(r'visitor|exposure|users|sessions', mname, re.I) and res['exposures'][0] is None:
            res['exposures'] = vals + [None]*(len(variants)-len(vals))
        else:
            kind = 'count' if all(v is None or v == int(v) for v in vals if v is not None) else 'value'
            metrics.append({'name': mname, 'kind': kind,
                            'values': vals + [None]*(len(variants)-len(vals))})
    res['metrics'] = metrics
    return res

MAY_END = '2026-05-31T00:00:00.000Z'
APRIL_END = '2026-04-30T00:00:00.000Z'

new_tid_n = 76
report_summary = []
for k, c in merged.items():
    is_queue = 'Implemented' in c['tags']
    months = c['months']
    created = APRIL_END if 'April' in months else MAY_END
    # find target experiment
    target_tid = MANUAL.get(k) or MANUAL.get(norm_title(c['name']))
    if not target_tid:
        target_tid = f'TEST-{new_tid_n:03d}'
        new_tid_n += 1
        is_new = True
    else:
        is_new = target_tid not in experiments
    dur = None
    for t in c['tags']:
        m = re.match(r'(\d+)\s*day', t)
        if m: dur = int(m.group(1))
    notes_parts = []
    if c.get('april_insights'): notes_parts.append('[April] ' + ' | '.join(c['april_insights']))
    if c['insights']: notes_parts.append(f"[{months[-1]}] " + ' | '.join(c['insights']))
    notes = '\n'.join(notes_parts)

    # April shipped winners tracked in May report — 3-month post-ship monitoring
    TRACKING = {norm_title(n) for n in (
        'Extra-discount books — navigation visibility',
        'Foreign book price-category — section redesign',
        'QuickDeal Badge — Related Product Section',
        'QuickDeal badge — related products section',
    )}
    if is_queue:
        status, result = queue_pill_to_stage(c['pill_txt']), 'In Progress'
    elif norm_title(c['name']) == norm_title('Express buy-now vs. regular checkout'):
        status, result = 'Monitoring', 'In Progress'  # shipped as feature, no control — user directive
    elif norm_title(c['name']) in TRACKING:
        status = 'Monitoring'
        # verdict from April pill (May tracking card may lack one)
        apill = c.get('april_pill') or c['pill_txt']
        result = 'Winner' if '✓' in apill or 'ship' in apill.lower() or 'holding' in apill.lower() else 'Inconclusive'
    else:
        status, result = pill_to_state(c['pill_cls'], c['pill_txt'])

    remarks_bits = [f"Report pill: {c['pill_txt']}" if c['pill_txt'] else '',
                    f"Report months: {'+'.join(months)}",
                    f"Report label: {c['report_tid']}" if c['report_tid'] and c['report_tid'] != target_tid else '',
                    f"April status: {c.get('april_pill')}" if c.get('april_pill') else '']
    remarks = ' · '.join(b for b in remarks_bits if b)

    if target_tid in experiments:
        exp = experiments[target_tid]
        exp['status'] = status
        exp['result'] = result
        if not exp['hypothesis']: exp['hypothesis'] = c['hypo']
        exp['results'] = matrix_to_results(c['matrix'], (exp['results']['notes'] + '\n' + notes).strip())
        exp['remarks'] = (exp['remarks'] + ' · ' + remarks).strip(' ·')
        exp['duration_days'] = exp['duration_days'] or dur
        if not exp['platform']: exp['platform'] = tag_platforms(c['tags'])
        exp['stage_history'].append({'stage': status, 'entered_at': MAY_END if 'May' in months else APRIL_END, 'note': f"from {'+'.join(months)} report"})
        action = 'enriched'
    else:
        title = re.sub(r'^TEST-\d+:\s*', '', c['name'])
        hist = [{'stage': 'Idea', 'entered_at': created, 'note': 'imported from report'}]
        if 'April' in months and 'May' in months and c.get('april_pill'):
            hist.append({'stage': 'Live', 'entered_at': APRIL_END, 'note': f"April: {c['april_pill']}"})
        hist.append({'stage': status, 'entered_at': MAY_END if 'May' in months else APRIL_END, 'note': f"{months[-1]}: {c['pill_txt']}"})
        pages = [t for t in c['tags'] if t not in ('Implemented','Mobile','Desktop') and not re.match(r'\d+\s*day', t)]
        exp = {
            'id': next_id, 'test_id': target_tid, 'title': title, 'status': status,
            'platform': tag_platforms(c['tags']),
            'pages': pages, 'hypothesis': c['hypo'], 'problem_statement': '',
            'metrics': {'primary': '', 'secondary': [], 'guardrail': []},
            'result': result, 'ice_score': None, 'sprint': None,
            'revenue_impact': None, 'creator': 'syed.nafis.sadique@gmail.com',
            'stage_history': hist,
            'results': matrix_to_results(c['matrix'], notes),
            'start_date': None, 'end_date': MAY_END if status == 'Completed' and 'May' in months else (APRIL_END if status == 'Completed' else None),
            'duration_days': dur, 'remarks': remarks,
            'growthbook_id': '', 'amaly_task_id': '',
            'source': 'self', 'promoted_from_idea_id': None, 'created_at': created,
            'potential_outcome': '',
        }
        experiments[target_tid] = exp
        next_id += 1
        action = 'created'
    report_summary.append(f"{target_tid} <- {c['name'][:55]} [{'+'.join(months)}] pill={c['pill_txt']} -> {status}/{result} ({action})")

# ---------- 4. pages registry ----------
pages = sorted({p for e in experiments.values() for p in e['pages'] if p})

# ---------- write ----------
exps = sorted(experiments.values(), key=lambda e: e['id'])
json.dump(exps, open(f'{OUT}/experiments.json', 'w'), indent=1, ensure_ascii=False)
json.dump([], open(f'{OUT}/tasks.json', 'w'))
json.dump([], open(f'{OUT}/ideas.json', 'w'))
json.dump(pages, open(f'{OUT}/pages.json', 'w'), indent=1, ensure_ascii=False)

print(f'{len(exps)} experiments, {len(pages)} pages')
from collections import Counter
print('by status:', dict(Counter(e['status'] for e in exps)))
print('by result:', dict(Counter(e['result'] for e in exps)))
print()
print('\n'.join(report_summary))
