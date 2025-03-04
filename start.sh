#!/bin/sh

gunicorn -b 127.0.0.1:5000  --workers 1 --threads 100 twidder:app