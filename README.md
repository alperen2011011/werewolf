# Werewolf

Bu proje ayni yerel ag uzerindeki oyuncularin tarayicidan baglanip oynayabildigi basit bir sosyal cikarim oyunudur.

## Oyunu Baslatma

Projeyi calistiran bilgisayar host olur.

```bash
npm install
npm start
```

Sunucu varsayilan olarak `3000` portunda calisir.

## Ayni Agda Arkadaslarla Oynama

Oyunu acan kisinin bilgisayari ile diger oyuncular ayni Wi-Fi veya ayni yerel agda olmalidir.

Genel mantik:
1. Host oyunu kendi bilgisayarinda baslatir.
2. Host kendi yerel IP adresini ogrenir.
3. Diger oyuncular tarayicida `http://HOST_IP:3000` adresine girer.
4. Herkes farkli bir isimle lobiye katilir.
5. Oyun 10 oyuncu oldugunda otomatik baslar.

Ornek adres:

```text
http://192.168.1.25:3000
```

## Windows Icin

### 0. Node.js Yukle

Windows kullanicilarinin oncelikle Node.js'i resmi sitesinden indirmesi gerekir:

```text
https://nodejs.org/
```

Node.js kurulduktan sonra PowerShell veya Komut Istemi'nde sunu calistirin:

### 1. Oyunu baslat

PowerShell veya Komut Istemi ac:

```bash
npm install
npm start
```

### 2. Bilgisayarin yerel IP adresini ogren

PowerShell veya Komut Istemi icinde sunu calistir:

```bash
ipconfig
```

`IPv4 Address` satirindaki adresi bul.
Ornek:

```text
IPv4 Address. . . . . . . . . . . : 192.168.1.25
```

### 3. Arkadaslarin bu adrese baglansin

Ayni agdaki herkes tarayicisina sunu yazar:

```text
http://192.168.1.25:3000
```

### 4. Calismazsa kontrol et

En yaygin sorun Windows Guvenlik Duvari olur. Ilk acilista Windows izin sorarsa `Allow access` sec.
Gerekirse Node.js veya `3000` portu icin ozel agda izin ver.

## Linux Icin

### 1. Oyunu baslat

Terminal ac ve sunu calistir:

```bash
npm install
npm start
```

### 2. Yerel IP adresini ogren

Asagidaki komutlardan birini kullan:

```bash
hostname -I
```

veya

```bash
ip a
```

Ornek IP:

```text
192.168.1.25
```

### 3. Arkadaslarin bu adrese baglansin

Ayni agdaki herkes tarayicisina sunu yazar:

```text
http://192.168.1.25:3000
```

### 4. Calismazsa kontrol et

Linux'ta guvenlik duvari kullaniyorsan `3000` portunun acik oldugundan emin ol.
Ornegin `ufw` kullaniyorsan:

```bash
sudo ufw allow 3000
```

## Onemli Notlar

- Herkes ayni yerel aga bagli olmali.
- Host bilgisayar oyunu acik tuttugu surece diger oyuncular baglanabilir.
- Host bilgisayar kapanirsa veya sunucu durursa oyun da kapanir.
- Bu yontem internet uzerinden degil, sadece ayni ag icinde calisir.

## Sorun Giderme

Eger arkadaslarin baglanamiyorsa sunlari kontrol et:

- Host bilgisayarda `npm start` hala calisiyor mu?
- IP adresi dogru mu?
- Herkes ayni modem veya ayni Wi-Fi uzerinde mi?
- Guvenlik duvari `3000` portunu engelliyor olabilir mi?
- Tarayicida `localhost:3000` yerine host bilgisayarin IP adresi mi kullaniliyor?
