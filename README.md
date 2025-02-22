# Osmosis Agent Toolkit

## Overview

This repository contains a collection of packages that are used to build the Osmosis Agent Toolkit.
Large Language Models (LLMs) can use these tools to interact with the Osmosis protocol.

## Available tools

| Tool            | Description        |
| --------------- | ------------------ |
| `bank.query`    | Query bank balance |
| `bank.tx.send`  | Send assets        |
| `assets.query`  | Search for assets  |
| `pools.tx.swap` | Swap assets        |

## Packages

### `@osmosis-agent-toolkit/core`

The core package contains the core functionality that is used by the other packages.
This is where registry data, query clients, and sign and broadcast logic is defined.
