"""F4.11 (DBG-011) — Exception HTTP ber-code eksplisit.

Amplop error INTERFACES.md §0.3 memetakan code dari status code
(`ERROR_CODES`), tetapi 422 dipakai dua makna berbeda:
`REASON_REQUIRED` (alasan kosong) dan `UNPROCESSABLE_ENTITY`
(body di luar enum, mis. PUT /laporan/{id}/status).
`ApiError` membawa `api_code` sendiri sehingga handler memakai code
eksplisit tanpa menebak dari status.
"""

from fastapi import HTTPException


class ApiError(HTTPException):
    """HTTPException dengan `error.code` eksplisit untuk amplop respons."""

    def __init__(self, status_code: int, code: str, detail: str):
        super().__init__(status_code=status_code, detail=detail)
        self.api_code = code
