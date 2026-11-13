# -*- coding: utf-8 -*-
"""
Script đẩy bộ FAQ đã làm sạch (faq_cleaned_192.json) vào Chatbot NeuroScan AI:
1. Chế độ API (Cloudflare Workers / FastAPI):
   python ingest_faq_to_chatbot.py --api-url http://127.0.0.1:8000 --reindex
   (hoặc trỏ tới https://neuroscan.pages.dev nếu đã cấu hình auth/admin)
2. Chế độ SQLite trực tiếp (backend_fastapi/neuroscan_local.db):
   python ingest_faq_to_chatbot.py --sqlite ../../backend_fastapi/neuroscan_local.db
"""
import argparse
import json
import os
import sqlite3
import urllib.request
import urllib.error


def load_records():
    here = os.path.dirname(os.path.abspath(__file__))
    json_file = os.path.join(here, 'faq_cleaned_192.json')
    with open(json_file, 'r', encoding='utf-8') as f:
        return json.load(f)


def ingest_sqlite(db_path: str):
    records = load_records()
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS faq_documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            source TEXT NOT NULL,
            category TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    inserted = 0
    skipped = 0
    for item in records:
        doc = item['faq_document']
        cur.execute('SELECT 1 FROM faq_documents WHERE title = ?', (doc['title'],))
        if cur.fetchone():
            skipped += 1
            continue
        cur.execute(
            'INSERT INTO faq_documents (title, content, source, category) VALUES (?, ?, ?, ?)',
            (doc['title'], doc['content'], doc['source'], doc['category']),
        )
        inserted += 1
    conn.commit()
    conn.close()
    print(f'[SQLite] Hoàn tất: Thêm mới {inserted} bản ghi, bỏ qua {skipped} bản ghi đã tồn tại.')


def ingest_api(api_url: str, reindex: bool, token: str | None):
    records = load_records()
    base = api_url.rstrip('/')
    existing_titles = set()

    try:
        req = urllib.request.Request(f'{base}/api/faq')
        if token:
            req.add_header('Authorization', f'Bearer {token}')
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            docs = data.get('data', {}).get('documents') or data.get('documents') or []
            existing_titles = {d.get('title', '').strip() for d in docs}
    except Exception as e:
        print(f'[Cảnh báo] Không lấy được danh sách FAQ hiện có: {e}')

    inserted = 0
    skipped = 0
    for item in records:
        doc = item['faq_document']
        if doc['title'].strip() in existing_titles:
            skipped += 1
            continue
        payload = json.dumps(doc, ensure_ascii=False).encode('utf-8')
        req = urllib.request.Request(f'{base}/api/faq', data=payload, method='POST')
        req.add_header('Content-Type', 'application/json; charset=utf-8')
        if token:
            req.add_header('Authorization', f'Bearer {token}')
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                if 200 <= resp.status < 300:
                    inserted += 1
        except urllib.error.HTTPError as err:
            print(f'[Lỗi HTTP {err.code}] {item["id"]}: {err.read().decode("utf-8", errors="ignore")}')

    print(f'[API] Hoàn tất: Đã đẩy {inserted} bản ghi, bỏ qua {skipped} bản ghi trùng tiêu đề.')

    if reindex:
        req = urllib.request.Request(f'{base}/api/rag/index', data=b'{}', method='POST')
        req.add_header('Content-Type', 'application/json')
        if token:
            req.add_header('Authorization', f'Bearer {token}')
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                print('[RAG Index]', resp.read().decode('utf-8'))
        except Exception as e:
            print(f'[RAG Index Lỗi]: {e}')


def main():
    parser = argparse.ArgumentParser(description='Đẩy bộ FAQ đã làm sạch vào Chatbot NeuroScan AI')
    parser.add_argument('--sqlite', help='Đường dẫn tới file SQLite local (vd: ../../backend_fastapi/neuroscan_local.db)')
    parser.add_argument('--api-url', help='Base URL của Backend API (vd: http://127.0.0.1:8000)')
    parser.add_argument('--token', help='Bearer token quản trị nếu API yêu cầu xác thực')
    parser.add_argument('--reindex', action='store_true', help='Gọi POST /api/rag/index sau khi nạp xong')
    args = parser.parse_args()

    if args.sqlite:
        ingest_sqlite(args.sqlite)
    elif args.api_url:
        ingest_api(args.api_url, args.reindex, args.token)
    else:
        parser.print_help()


if __name__ == '__main__':
    main()
