"""Storage helper untuk MinIO/S3."""

import io
from typing import Optional
from minio import Minio
from minio.error import S3Error
from app.core.config import settings


class StorageClient:
    """Client untuk MinIO/S3."""

    def __init__(self):
        self.client = Minio(
            settings.MINIO_ENDPOINT.replace("http://", "").replace("https://", ""),
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_ENDPOINT.startswith("https"),
        )
        self.bucket = settings.MINIO_BUCKET

    def upload_file(
        self, file_content: bytes, file_name: str, content_type: str = "application/octet-stream"
    ) -> Optional[str]:
        """Upload file ke MinIO."""
        try:
            # Ensure bucket exists
            if not self.client.bucket_exists(self.bucket):
                self.client.make_bucket(self.bucket)

            # Upload file
            file_size = len(file_content)
            self.client.put_object(
                self.bucket,
                file_name,
                io.BytesIO(file_content),
                file_size,
                content_type=content_type,
            )
            return file_name
        except S3Error as e:
            print(f"Error uploading file: {e}")
            return None

    def get_file_url(self, file_name: str) -> str:
        """Get public URL untuk file."""
        # Presigned URL valid for 7 days
        try:
            url = self.client.get_presigned_download_link(
                self.bucket, file_name, expires=7 * 24 * 60 * 60
            )
            return url
        except S3Error:
            return f"{settings.MINIO_ENDPOINT}/{self.bucket}/{file_name}"

    def delete_file(self, file_name: str) -> bool:
        """Delete file dari MinIO."""
        try:
            self.client.remove_object(self.bucket, file_name)
            return True
        except S3Error:
            return False


storage_client = StorageClient()