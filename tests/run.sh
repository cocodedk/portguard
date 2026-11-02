#!/usr/bin/env bash
# Plain bash tests for portguard's pure parts. Run: tests/run.sh
# shellcheck disable=SC2034  # ALLOWED_PORTS is read by allowed() from portguard
set -uo pipefail
cd "$(dirname "$0")/.." || exit 1
# shellcheck source=/dev/null
source ./portguard || true   # the script does not run main when sourced
set +e

EXPECTED_TESTS=18
fails=0 count=0
LOG=$(mktemp); trap 'rm -f "$LOG"' EXIT
logger() { echo "$*" >> "$LOG"; }   # stands in for syslog (listeners runs in a subshell, so a file)

check() {  # <name> <expected> <actual>
  count=$((count + 1))
  if [ "$2" = "$3" ]; then echo "ok   $1"; else
    echo "FAIL $1"; echo "  expected: $2"; echo "  actual:   $3"; fails=$((fails + 1)); fi
}

# Recorded `ss -ltnH` lines (documentation addresses only).
SS=$(cat <<'EOF'
LISTEN 0 4096      127.0.0.1:631   0.0.0.0:*
LISTEN 0 4096   127.0.0.53%lo:53   0.0.0.0:*
LISTEN 0 4096          [::1]:631      [::]:*
LISTEN 0 128  [::ffff:127.0.0.1]:9000   [::]:*
LISTEN 0 128        0.0.0.0:7777   0.0.0.0:*
LISTEN 0 128           [::]:7777      [::]:*
LISTEN 0 128              *:8080         *:*
LISTEN 0 128     192.0.2.10:2222   0.0.0.0:*
LISTEN 0 128 [2001:db8::5]:8443      [::]:*
LISTEN 0 128 [fe80::1%eth0]:5353     [::]:*
EOF
)
out=$(listeners "$SS")

has() { grep -qxF "$1" <<< "$out" && echo yes || echo no; }
check "listeners: loopback v4 dropped"          no  "$(has '127.0.0.1 631')"
check "listeners: loopback v6 dropped"          no  "$(has '::1 631')"
check "listeners: v4-mapped loopback dropped"   no  "$(has '::ffff:127.0.0.1 9000')"
check "listeners: lo-scoped dropped"            no  "$(has '127.0.0.53 53')"
check "listeners: wildcard v4 kept"             yes "$(has '0.0.0.0 7777')"
check "listeners: wildcard v6 kept, brackets removed" yes "$(has ':: 7777')"
check "listeners: star kept"                    yes "$(has '* 8080')"
check "listeners: specific address kept"        yes "$(has '192.0.2.10 2222')"
check "listeners: scoped link-local not probed, logged" \
  "not probed: fe80::1%eth0 port 5353" "$(sed 's/^-t [a-z]* //' "$LOG")"
check "listeners: exactly 5 probe lines"        5   "$(wc -l <<< "$out" | tr -d ' ')"

check "targets: 0.0.0.0"   "$HOST_V4"            "$(targets 0.0.0.0)"
check "targets: ::"        "$HOST_V6 $HOST_V4"   "$(targets '::')"
check "targets: *"         "$HOST_V4 $HOST_V6"   "$(targets '*')"
check "targets: specific"  "192.0.2.10"          "$(targets 192.0.2.10)"

ALLOWED_PORTS="22 7777 8080"
a() { allowed "$1" && echo yes || echo no; }
check "allowed: listed port"             yes "$(a 7777)"
check "allowed: unlisted port"           no  "$(a 80)"
check "allowed: no substring match"      no  "$(a 777)"
ALLOWED_PORTS=""
check "allowed: empty list allows none"  no  "$(a 7777)"

[ "$count" -eq "$EXPECTED_TESTS" ] || { echo "FAIL test count: expected $EXPECTED_TESTS, ran $count"; fails=$((fails + 1)); }
echo "$count tests, $fails failed"
[ "$fails" -eq 0 ]
