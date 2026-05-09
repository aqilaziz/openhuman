#!/bin/bash
sed -i '/<<<<<<< HEAD/d' app/src/components/intelligence/ConfirmationModal.tsx
sed -i '/=======/,/>>>>>>> origin\/main/d' app/src/components/intelligence/ConfirmationModal.tsx
