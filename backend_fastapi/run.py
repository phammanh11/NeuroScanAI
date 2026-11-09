import uvicorn

if __name__ == "__main__":
    print("==================================================================")
    print(" Khởi chạy NeuroScan AI FastAPI Backend Server tại:")
    print(" - API Base URL:  http://127.0.0.1:8000/api")
    print(" - Swagger Docs:  http://127.0.0.1:8000/docs")
    print(" - ReDoc Docs:    http://127.0.0.1:8000/redoc")
    print("==================================================================")
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
