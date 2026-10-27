# Architecture

Kiáº¿n trĂºc **hiá»‡n cĂ³** cá»§a dá»± Ă¡n â€” tĂ i liá»‡u mĂ´ táº£ thá»±c tráº¡ng, khĂ´ng pháº£i thiáº¿t káº¿ mong muá»‘n. Äá»c trÆ°á»›c khi thay Ä‘á»•i mang tĂ­nh kiáº¿n trĂºc (thĂªm service má»›i, Ä‘á»•i luá»“ng dá»¯ liá»‡u, thĂªm game má»›i, Ä‘á»•i háº¡ táº§ng).

| File | Ná»™i dung |
|---|---|
| [`system.md`](./system.md) | Tá»•ng quan stack, ports, cáº¥u trĂºc thÆ° má»¥c, ranh giá»›i Platform/Games |
| [`frontend.md`](./frontend.md) | Kiáº¿n trĂºc component (platform vs. game), hook pattern, tÆ°Æ¡ng tĂ¡c board SVG |
| [`backend.md`](./backend.md) | PhĂ¢n táº§ng Controller/Hub â†’ Engine â†’ Services â†’ DB, luá»“ng `MakeMove` |
| [`database.md`](./database.md) | PostgreSQL lĂ  nguá»“n sá»± tháº­t, schema bootstrap khĂ´ng migration, JSONB cho dá»¯ liá»‡u game |
| [`infrastructure.md`](./infrastructure.md) | Docker Compose, Redis/RabbitMQ/OpenSearch/MinIO, Kubernetes |

Khi má»™t thay Ä‘á»•i kiáº¿n trĂºc Ä‘Æ°á»£c thá»±c hiá»‡n: cáº­p nháº­t file liĂªn quan á»Ÿ Ä‘Ă¢y **vĂ ** ghi quyáº¿t Ä‘á»‹nh vĂ o [`../history/decisions.md`](../history/decisions.md) náº¿u lĂ  quyáº¿t Ä‘á»‹nh Ä‘Ă¡ng nhá»›.

## Hiệu ứng trong lúc chơi

- [gameplay-animation.md](./gameplay-animation.md) — nguyên tắc và checklist cho animation trong ván.

