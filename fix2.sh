#!/bin/bash
sed -i '/<<<<<<< HEAD/d' app/src/types/intelligence.ts
sed -i '/=======/,/>>>>>>> origin\/main/d' app/src/types/intelligence.ts
