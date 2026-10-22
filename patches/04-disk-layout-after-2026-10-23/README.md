# UX370 分割表快照：動工後（2026-10-23）

[項目 04](../../issues/in-progress/04-ssd-repartition.md) 用 GParted 完成分割調整後的分割表。**這是目前（新配置）的狀態**；動工前的舊配置見 [`../04-disk-layout-backup-2026-10-21/`](../04-disk-layout-backup-2026-10-21/)。

硬碟：KINGSTON SA2000M81000G，序號 50026B7684D2CA9B，931.5 GB（1953525168 磁區），GPT。
GPT label-id：`87C37755-4875-45C8-828B-8A0436221D88`（跟動工前相同）

⚠️ **這份快照只救「分割表被改錯」，不救「分割區內的資料被覆蓋」。**

## 檔案

| 檔案 | 內容 |
| --- | --- |
| `gpt-table.bin` | `sgdisk --backup` 產生的 GPT 二進位完整副本（主要還原手段） |
| `sfdisk-dump.txt` | 同樣的分割表，文字格式 |
| `sgdisk-print.txt` | 分割表的人類可讀列表 |
| `efi-boot-entries.txt` | `efibootmgr -v` 的 UEFI 開機項目 |
| `blkid.txt` / `lsblk.txt` | 各分割區的 UUID、PARTUUID、標籤、GPT 屬性 |
| `fstab.txt` | 動工後的 `/etc/fstab`（跟動工前相同，沒有改過） |

## 怎麼還原分割表

⚠️ **這是破壞性操作，會覆蓋整個分割表。** 只在確認分割表被改壞、而且要回到 2026-10-23 這個新配置時才做。
⚠️ **務必先確認目標是 `/dev/nvme0n1`**（用 `lsblk` 核對型號與序號）。
⚠️ 操作時該硬碟上的分割區都不能掛載——**從 Live USB 執行**。

```bash
sgdisk --load-backup=gpt-table.bin /dev/nvme0n1
partprobe /dev/nvme0n1
```

沒有 `sgdisk` 時：

```bash
sfdisk /dev/nvme0n1 < sfdisk-dump.txt
partprobe /dev/nvme0n1
```

還原後用 `lsblk` 與 `sgdisk-print.txt` 核對。

## 動工後的配置

| 分割區 | 起點磁區 | 起點（MiB） | 大小（MiB） | 檔案系統 | 用途 |
| --- | --- | --- | --- | --- | --- |
| p1 | 34 | 0.02 | 128 | 無 | 微軟保留區（沒有對齊，不影響） |
| p2 | 264192 | 129 | 260 | vfat | EFI `/boot/efi`（沒動） |
| p3 | 796672 | 389 | 307303 | ntfs | Windows，300.10 GiB（起點沒動） |
| p4 | 630153216 | 307692 | 2048 | ntfs | Windows 修復環境，保留 `RequiredPartition GUID:63` 屬性 |
| p5 | 634347520 | 309740 | 426674 | ntfs | 資料槽（新建，標籤 `Data`） |
| p6 | 1508175872 | 736414 | 24576 | swap | swap（新建，標籤 `swap`） |
| p7 | 1558507520 | 760990 | 2048 | ext4 | Fedora `/boot` |
| p8 | 1562701824 | 763038 | 190831 | btrfs | Fedora `/` + `/home` |

p2～p8 的起點全部是整數 MiB（1 MiB 對齊，也就是 SSD 的 4K 對齊）。

跟動工前比：p1、p2 完全沒動；p3 起點沒變、往後長大；p4 往後移並加大；舊 p5（600 GB 資料槽）與舊 p6（舊 RECOVERY）刪除後，在原位置新建 p5（資料槽）與 p6（swap）；p7、p8 往前搬，p8 往前長大。檔案系統 UUID 與 p7、p8 的 PARTUUID 都跟動工前相同。
