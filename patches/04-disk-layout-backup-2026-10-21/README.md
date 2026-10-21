# UX370 分割表備份（2026-10-21）

[項目 04](../../issues/in-progress/04-ssd-repartition.md) 動工前的第 1 層備份——**動分割區之前的原始狀態**。

硬碟：KINGSTON SA2000M81000G，序號 50026B7684D2CA9B，931.5 GB（1953525168 磁區），GPT。
GPT label-id：`87C37755-4875-45C8-828B-8A0436221D88`

⚠️ **這份備份只救「分割表被改錯」，不救「分割區內的資料被覆蓋」。** 資料層的還原請用 Acronis 映像：
`外接硬碟:/backup_image/UX370_before_move_disk_full_b1_s1_v1.tib`（121 GB，2026-10-21 建立）。

## 檔案

| 檔案 | 內容 |
| --- | --- |
| `gpt-table.bin` | `sgdisk --backup` 產生的 GPT 二進位完整副本（主要還原手段） |
| `sfdisk-dump.txt` | 同樣的分割表，文字格式，可讀可手動比對 |
| `sgdisk-print.txt` | 分割表的人類可讀列表 |
| `efi-boot-entries.txt` | `efibootmgr -v` 的 UEFI 開機項目 |
| `blkid.txt` / `lsblk.txt` | 各分割區的 UUID、PARTUUID、標籤 |
| `fstab.txt` | 動工前的 `/etc/fstab` |

## 怎麼還原分割表

⚠️ **這是破壞性操作，會覆蓋整個分割表。** 只在確認分割表被改壞、而且要回到 2026-10-21 動工前狀態時才做。
⚠️ **務必先確認目標是 `/dev/nvme0n1`**（用 `lsblk` 核對型號與序號），寫錯裝置會毀掉別顆硬碟。
⚠️ 操作時該硬碟上的分割區都不能掛載——**從 Live USB 執行**。

二進位還原（優先）：

```bash
sgdisk --load-backup=gpt-table.bin /dev/nvme0n1
partprobe /dev/nvme0n1
```

文字版還原（沒有 `sgdisk` 時）：

```bash
sfdisk /dev/nvme0n1 < sfdisk-dump.txt
partprobe /dev/nvme0n1
```

還原後用 `lsblk` 與 `sgdisk-print.txt` 核對是否一致。

## 動工前的原始配置

| 分割區 | 起始磁區 | 大小 | 檔案系統 | 用途 |
| --- | --- | --- | --- | --- |
| p1 | 34 | 128 MB | 無 | 微軟保留區 MSR |
| p2 | 264192 | 260 MB | vfat | EFI `/boot/efi` |
| p3 | 796672 | 299 GB | ntfs | Windows `OS` |
| p4 | 627408896 | 1.4 GB | ntfs | Windows 修復（有 `RequiredPartition` 屬性） |
| p5 | 630151168 | 601 GB | ntfs | 資料槽 |
| p6 | 1888860160 | 823 MB | ntfs | `RECOVERY` |
| p7 | 1890545664 | 2 GB | ext4 | Fedora `/boot` |
| p8 | 1894739968 | 29 GB | btrfs | Fedora `/` + `/home` |

## 搬動分割區後的注意事項

- **`/etc/fstab` 不需要修改。** 四個掛載點全部以 UUID 指定，而搬動分割區會保留檔案系統 UUID：
  - `/` 與 `/home`：`9d957795-c4d4-4dd2-8925-83696a384f48`（btrfs，subvol `root` / `home`）
  - `/boot`：`ec07cacc-1ba9-47cd-8bfe-a90aab13e40e`
  - `/boot/efi`：`7BAA-6405`
- **p4 帶有 `RequiredPartition` 屬性**（GUID:63），重建或調整時要保留，否則 Windows 修復環境可能失效。
- 搬動後若無法開機，先比對 `efi-boot-entries.txt` 檢查 UEFI 開機項目是否還在。
