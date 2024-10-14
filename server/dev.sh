#!/usr/bin/env zsh

# runs server detecting changes and reloading if it can

source "$HOME/.nvm/nvm.sh"
nvm install
pnpm run dev
