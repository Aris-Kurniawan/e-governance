"""Storage helper untuk ImageKit dan MinIO/S3."""

import base64
import io
from typing import Optional
import httpx
from minio import Minio
from minio.error import S3Error
from app.core.config import settings


class StorageClient:
    """Client untuk ImageKit dan MinIO/S3."""

    def __init__(self):
        self.bucket = settings.MINIO_BUCKET
        self.imagekit_private_key = settings.IMAGEKIT_PRIVATE_KEY
        self.imagekit_url_endpoint = settings.IMAGEKIT_URL_ENDPOINT

        self.minio_client = None
        if settings.MINIO_ACCESS_KEY and settings.MINIO_SECRET_KEY:
            try:
                self.minio_client = Minio(
                    settings.MINIO_ENDPOINT.replace("http://", "").replace("https://", ""),
                    access_key=settings.MINIO_ACCESS_KEY,
                    secret_key=settings.MINIO_SECRET_KEY,
                    secure=settings.MINIO_ENDPOINT.startswith("https"),
                )
            except Exception:
                self.minio_client = None

    def upload_file(
        self, file_content: bytes, file_name: str, content_type: str = "application/octet-stream"
    ) -> Optional[str]:
        """Upload file ke ImageKit (prioritas) atau MinIO."""
        # 1. ImageKit Cloud Storage
        if self.imagekit_private_key:
            try:
                auth = base64.b64encode(f"{self.imagekit_private_key}:".encode()).decode()
                clean_name = file_name.split("/")[-1]
                files = {
                    "file": (clean_name, file_content, content_type),
                }
                data = {
                    "fileName": clean_name,
                    "folder": "/simakis",
                    "useUniqueFileName": "true",
                }
                headers = {"Authorization": f"Basic {auth}"}
                response = httpx.post(
                    "https://upload.imagekit.io/api/v1/files/upload",
                    files=files,
                    data=data,
                    headers=headers,
                    timeout=30.0,
                )
                if response.status_code == 200:
                    res_json = response.json()
                    return res_json.get("url")
                else:
                    print(f"Error ImageKit upload: {response.status_code} {response.text}")
            except Exception as e:
                print(f"Error uploading to ImageKit: {e}")

        # 2. Fallback MinIO
        if self.minio_client:
            try:
                if not self.minio_client.bucket_exists(self.bucket):
                    self.minio_client.make_bucket(self.bucket)

                file_size = len(file_content)
                self.minio_client.put_object(
                    self.bucket,
                    file_name,
                    io.BytesIO(file_content),
                    file_size,
                    content_type=content_type,
                )
                return file_name
            except S3Error as e:
                print(f"Error uploading to MinIO: {e}")

        return None

    def get_file_url(self, file_name: str) -> str:
        """Get public URL untuk file."""
        if file_name.startswith("http://") or file_name.startswith("https://"):
            return file_name
        if self.minio_client:
            try:
                url = self.minio_client.get_presigned_download_link(
                    self.bucket, file_name, expires=7 * 24 * 60 * 60
                )
                return url
            except S3Error:
                return f"{settings.MINIO_ENDPOINT}/{self.bucket}/{file_name}"
        return file_name

    def delete_file(self, file_name: str) -> bool:
        """Delete file dari storage."""
        if file_name.startswith("http://") or file_name.startswith("https://"):
            return True
        if self.minio_client:
            try:
                self.minio_client.remove_object(self.bucket, file_name)
                return True
            except S3Error:
                return False
        return True


storage_client = StorageClient()