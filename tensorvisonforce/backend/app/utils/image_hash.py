"""
Lightweight perceptual hash (pHash-style, DCT-free average-hash variant)
so we don't need an extra native dependency like `imagehash`/`scipy`.

This is a simplified "difference hash" (dHash): resize to (n+1) x n,
compare adjacent pixel brightness, and pack the resulting bits into a
hex string. Two images of the same real-world scene taken moments apart
(different phone, angle, or compression) will produce hashes with a
small Hamming distance; unrelated images will differ substantially.
"""
from PIL import Image

HASH_SIZE = 8  # -> 64-bit hash


def compute_dhash(image: Image.Image, hash_size: int = HASH_SIZE) -> str:
    gray = image.convert("L").resize((hash_size + 1, hash_size), Image.LANCZOS)
    pixels = list(gray.getdata())

    bits = []
    for row in range(hash_size):
        row_start = row * (hash_size + 1)
        for col in range(hash_size):
            left = pixels[row_start + col]
            right = pixels[row_start + col + 1]
            bits.append(1 if left > right else 0)

    # Pack bits into a hex string.
    value = 0
    for bit in bits:
        value = (value << 1) | bit
    return format(value, f"0{hash_size * hash_size // 4}x")


def compute_dhash_from_path(path: str, hash_size: int = HASH_SIZE) -> str:
    with Image.open(path) as img:
        return compute_dhash(img, hash_size=hash_size)


def hamming_distance(hash_a: str, hash_b: str) -> int:
    if len(hash_a) != len(hash_b):
        raise ValueError("Hashes must be the same length to compare")
    int_a = int(hash_a, 16)
    int_b = int(hash_b, 16)
    return bin(int_a ^ int_b).count("1")


def is_likely_duplicate(hash_a: str, hash_b: str, threshold: int = 8) -> bool:
    return hamming_distance(hash_a, hash_b) <= threshold
