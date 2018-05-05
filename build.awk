#!/usr/bin/awk -f

/```/ { emit=!emit ; next }
// { if (emit) print }
