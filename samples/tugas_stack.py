# Praktikum Algoritma dan Struktur Data - Universitas Kristen Maranatha
# Topik: Implementasi Stack Berbasis Array

class StackArray:
    def __init__(self, size):
        self.size = size

if __name__ == '__main__':
    s = StackArray(5)
    s.push(100)
    s.push(200)
    s.push(300)
    s.pop()
    s.push(400)
