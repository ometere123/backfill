import os
from pathlib import Path
import pytest
from gltest.direct.loader import deploy_contract


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


@pytest.fixture
def direct_deploy(direct_vm):
    """Use the pinned GenVM release instead of the moving GitHub latest alias."""
    def deploy(contract_path, *args, sdk_version="v0.2.16", **kwargs):
        path = Path(contract_path)
        if not path.is_absolute():
            path = (Path.cwd() / path).resolve()
        return deploy_contract(path, direct_vm, *args, sdk_version=sdk_version, **kwargs)
    return deploy
