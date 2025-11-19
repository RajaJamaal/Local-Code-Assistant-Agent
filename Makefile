VENV ?= .venv
PYTHON ?= $(VENV)/bin/python
PIP ?= $(VENV)/bin/pip

.PHONY: setup test-cli test-json test-llm test-all build-extension package-extension clean

setup:
	python3 -m venv $(VENV)
	$(PIP) install -r requirements.txt

test-cli:
	. $(VENV)/bin/activate && python tests/manual/test_cli_simple_suite.py

test-json:
	. $(VENV)/bin/activate && python tests/manual/test_cli_json.py

test-llm:
	. $(VENV)/bin/activate && LANGGRAPH_AGENT_MOCK=1 python tests/manual/test_cli_langgraph_mock.py

test-all: test-cli test-json test-llm

build-extension:
	cd vscode-extension && npm install && npm run compile

package-extension: build-extension
	cd vscode-extension && npx --yes @vscode/vsce package

clean:
	rm -rf $(VENV)
