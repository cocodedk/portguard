# portguard

portguard is a bash script that finds TCP ports another machine could reach past your firewall, blocks them, and tells you.

It runs as root from cron every minute. It needs `ip`, `nft`, `ss`, `flock`, `logger` and `runuser` (standard on Debian and Ubuntu), plus `notify-send` for desktop alerts.

## Website
- [English](https://portguard.cocode.dk/)
- [فارسی (Persian)](https://portguard.cocode.dk/fa/)

## Why

ufw is often trusted as "the" firewall. But Docker run as root publishes ports with its own NAT rules, and that forwarding skips ufw's rules. A container started with `-p 7777:7777` can be reachable from the whole network even though `ufw status` shows no such rule. Looking at the firewall rules does not tell you what is reachable; only trying to connect does.

## What it does

- Lists every TCP listener that is not bound to loopback.
- Probes each one from a throwaway network namespace joined to the host by a veth pair. Its packets arrive on a real interface, so ufw and Docker's port publishing treat the probe like a host on your LAN.
- For every port that answers, adds a drop rule for new inbound connections to its own nftables table, `inet portguard`, hooked at prerouting with raw priority (before conntrack and before Docker's forwarding). Rules match the host's own addresses only (`fib daddr type local`), so containers' outbound traffic to that port still flows.
- Writes a syslog alert (tag `portguard`) and sends a critical desktop notification to every signed-in user.
- Takes a lock, so a run that is still going makes the next one skip.

## Install

```sh
sudo install -m 0755 -o root -g root portguard /usr/local/sbin/portguard
sudo install -m 0644 -o root -g root portguard.cron /etc/cron.d/portguard
```

Releases carry `portguard`, `portguard.cron` and `SHA256SUMS`, with a provenance attestation (`gh attestation verify portguard --repo cocodedk/portguard`).

## Try it

1. Open a port through ufw and put a listener on it, for example:
   ```sh
   sudo ufw allow 7777/tcp
   python3 -m http.server 7777 &
   ```
2. Run it: `sudo portguard`.
3. You get a syslog alert (`journalctl -t portguard`, or `grep portguard /var/log/syslog`) and a desktop notification, and the block is listed:
   ```sh
   sudo nft list table inet portguard
   ```
4. Clean up: stop the listener (`kill %1`), `sudo ufw delete allow 7777/tcp`, and `sudo nft delete table inet portguard`.

## Undo a block

A denied port stays denied until reboot, or until you delete the table:

```sh
sudo nft delete table inet portguard
```

After a reboot, or if the port is still reachable, the next run finds it again. To keep a port reachable on purpose, list it in `ALLOWED_PORTS`.

## ALLOWED_PORTS

Near the top of `portguard`:

```sh
ALLOWED_PORTS="22 7777"   # TCP ports that may stay reachable from the network, space-separated
```

Listed ports are not probed and never blocked.

## Limits

- TCP only.
- The probe comes from a link-local address on its own interface to the host's probe-facing address. A ufw rule that allows only certain sources, interfaces or destination addresses is not simulated, and neither is Docker's routed (non-NAT) gateway mode.
- A listener bound to one interface (IPv6 link-local) is logged, not probed.
- A denied port stays denied until reboot, or until `nft delete table inet portguard`.

## Tests

```sh
tests/run.sh
```

Plain bash tests of the pure parts: parsing `ss -ltnH` output, `targets`, and the `ALLOWED_PORTS` check. The probe itself needs root and network namespaces and is checked by hand (see "Try it").

## Author

**Babak Bandpey** — [https://cocode.dk](https://cocode.dk) | [LinkedIn](https://linkedin.com/in/babakbandpey) | [GitHub](https://github.com/cocodedk)

## License

Apache-2.0 | © 2026 [Cocode](https://cocode.dk) | Created by [Babak Bandpey](https://linkedin.com/in/babakbandpey)
