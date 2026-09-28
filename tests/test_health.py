"""The CI audit must not require nonexistent credentials for a keyless project."""
import pytest

from scripts import health_check


@pytest.mark.parametrize(('example', 'env', 'failures'), [
    ('# No required variables\n', None, 0),
    ('REQUIRED_KEY=\n', None, 1),
    ('REQUIRED_KEY=\n', 'OTHER_KEY=example\n', 1),
    ('REQUIRED_KEY=\n', 'REQUIRED_KEY=example\n', 0),
])
def test_environment_contract(tmp_path, monkeypatch, example, env, failures):
    (tmp_path / '.env.example').write_text(example)
    if env is not None:
        (tmp_path / '.env').write_text(env)
    monkeypatch.setattr(health_check, 'ROOT', tmp_path)
    monkeypatch.setattr(health_check, 'failures_count', 0)
    monkeypatch.setattr(health_check, 'warnings_count', 0)
    health_check.check_env('workflow-python')
    assert health_check.failures_count == failures
