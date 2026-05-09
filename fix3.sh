#!/bin/bash
sed -i '/<<<<<<< HEAD/d' app/src/components/intelligence/__tests__/ConfirmationModal.test.tsx
sed -i '/=======/,/>>>>>>> origin\/main/d' app/src/components/intelligence/__tests__/ConfirmationModal.test.tsx
