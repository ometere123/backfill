import os
import pytest


@pytest.fixture(autouse=True)
def tolerate_windows_gltest_temp_cleanup(monkeypatch):
    original_unlink = os.unlink

    def safe_unlink(path, *args, **kwargs):
        try:
            return original_unlink(path, *args, **kwargs)
        except PermissionError:
            # gltest keeps stdin redirected to the temp file until contract
            # teardown; Windows cannot unlink that open handle immediately.
            if str(path).lower().split("\\")[-1].startswith("tmp"):
                return None
            raise

    monkeypatch.setattr(os, "unlink", safe_unlink)
