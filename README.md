# Relai

**Ajan değişsin. Bağlamın seninle gelsin.**

Codex ve Claude Code oturum dosyalarını dönüştürmeden önce gizlilik kontrolünden geçiren, bilgisayarında çalışan Türkçe uygulama. Dönüşüm çekirdeği Skillsync ekibinin [txcript](https://github.com/skillsynchq/txcript) kütüphanesidir.

## Neler yapar?

- Codex ↔ Claude Code JSONL dönüşümü ve yeni oturum kimliği.
- Konuşma önizleme, arama ve aktarımda değişen alanların raporu.
- Olası API anahtarı, e-posta, Türkiye cep telefonu, kullanıcı klasörü ve hassas ortam değişkeni değerlerini bulma.
- Gizle/Koru seçimleri, özel ifade araması ve dönüşüm öncesi açık onay.
- Türkçe harfleri dikkate alan, kelime sınırlarıyla çalışan manuel arama.
- Kullanıcının doldurduğu Markdown proje devir kartı.

## Kurulum

Node.js 22 veya üzeri gerekir.

```bash
git clone https://github.com/ismailburakyilmaz/relai.git
cd relai
npm ci
npm start
```

Tarayıcıda http://127.0.0.1:4317 adresini açın. Windows'ta `BASLAT.cmd` de kullanılabilir. İlk kurulum bağımlılığı npm üzerinden indirir. Durdurmak için terminalde Ctrl+C kullanın.

## Kullanım

1. Oturum JSONL dosyasını yükleyin veya **Dosyam yok, örnekle dene** düğmesini kullanın.
2. Gizlilik bulgularında Gizle/Koru seçin, önizleyin ve incelemeyi tamamlayın. Bulgu yoksa Devam et yeterlidir.
3. Hedef ajanı seçip dosyayı hazırlayın.
4. Oturum dosyasını ve isteğe bağlı raporu indirin.

İndirme, oturumu hedef ajana otomatik eklemez. Hedef ajanda açma ve devam ettirme ayrı işlemdir. ChatGPT/Claude normal sohbet dışa aktarımları desteklenmez; kodlama ajanlarının oturum dosyaları gerekir.

## Gizlilik ve sınırlar

Dosya yalnızca yerel sunucuda bellekte işlenir; dönüştürücü dış AI servisine gönderim yapmaz. İndirilen dosya hedef ajanda kullanıldığında içerik, o ajanın çalışma biçimine göre sağlayıcısına gönderilebilir.

- Dosya sınırı 16 MB. Sunucu yalnızca 127.0.0.1 adresinde dinler.
- Tespit örüntü tabanlıdır; tüm hassas verileri bulma veya temizleme garantisi yoktur.
- Araç kayıtları ve oturum ayarları otomatik değiştirilmez; hassas değerler bu alanlarda kalabilir.
- Ekran maskesi dosyada gizleme değildir. Koru seçilen değerler çıktıda açık kalır.
- Manuel aramada i/İ/ı/I eşdeğerdir. Bu yaklaşım ek eşleşmeler üretebilir.
- Önizleme ilk 200 arama eşleşmesiyle, bulgu listesi 300 farklı değerle sınırlıdır. Dönüşüm tüm oturumu işler.
- Proje dosyaları, hesap erişimi ve araçlar ayrıca gerekir. Her yeni çıktı için hedef ajanda devam testi yapılmalıdır.
- Devir kartı manuel doldurulur; otomatik AI özeti değildir.

## Test

```bash
npm test
```

17 otomatik test kurmaca verilerle çalışır. Dönüşüm, gizleme, Türkçe harfler, kelime sınırları, telefon/.env kuralları ve korunan araç kayıtları sınanır. Gerçek konuşma veya hesap bilgisi gerekmez. Bu testler hedef ajanda model yanıtı üretmez.

## Teknik yapı

Vanilla HTML/CSS/JavaScript arayüz, Node.js yerel HTTP sunucusu, txcript 0.14.4 dönüşüm çekirdeği. Uygulamaya bağlı ücretli AI API'si yoktur.

## Kaynak ve atıf

Skillsync'ten esinlenilmiştir. Türkçe kullanım akışı ve gizlilik incelemesi bu projenin katkılarıdır. txcript Apache-2.0 lisanslıdır; ayrıntılar [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) içindedir. Skillsync, OpenAI veya Anthropic ile resmi bağlantısı yoktur.
