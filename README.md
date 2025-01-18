# bones-cli

CLI wallet for interacting with the bones protocol. 

## Disclaimer

⚠️ **WARNING**: This is a work-in-progress tool and is not yet ready for production use. Using this tool involves significant risks, including but not limited to:

- **Loss of Funds**: Misuse, software bugs, or unexpected behavior can result in the permanent and total loss of your funds.
- **Security Risks**: This tool does not guarantee protection against vulnerabilities or attacks.

By using `bones-cli`, you acknowledge and accept these risks. Only use it with funds you can afford to lose, and proceed with caution.

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/bonesprotocol/bones-cli.git
   cd bones-cli
   ```
   
2. Install the dependencies:
   ```bash
    npm install
    ```
   
3.	Configure environment variables:
    - Copy the example environment file:
    ```bash
    cp .env.example .env
    ```
    - Open .env and adjust the variables as needed.

## Usage

Run the CLI to see available commands:

```bash
npm start -- help
```

For example, to create a new wallet run:

```bash
npm start -- wallet create
```

Mint bones:

```bash
npm start -- bones mint SWAPPY 20
```

List bones:

```bash
npm start --bones list
```

Transfer bones:

```bash
npm start -- bones transfer SWAPPY 1000000000000 (Receiving Address )
```

More commands Execution help:

```bash
npm start -- help
```

