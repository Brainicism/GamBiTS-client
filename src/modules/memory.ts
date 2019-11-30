// implement functions to read/write bytes, and the arrays of memory, and also load a rom

// Rom from: https://gbdev.gg8.se/wiki/articles/Gameboy_Bootstrap_ROM#Contents_of_the_ROM
// Format-Hex "C:\Users\thom\Downloads\DMG_ROM.bin" | % { ($_.Bytes | %{ "0x{0:x2}," -f $_ }) -join " " } | clip
const BootRom: number[] = [
    0x31, 0xfe, 0xff, 0xaf, 0x21, 0xff, 0x9f, 0x32, 0xcb, 0x7c, 0x20, 0xfb, 0x21, 0x26, 0xff, 0x0e,
    0x11, 0x3e, 0x80, 0x32, 0xe2, 0x0c, 0x3e, 0xf3, 0xe2, 0x32, 0x3e, 0x77, 0x77, 0x3e, 0xfc, 0xe0,
    0x47, 0x11, 0x04, 0x01, 0x21, 0x10, 0x80, 0x1a, 0xcd, 0x95, 0x00, 0xcd, 0x96, 0x00, 0x13, 0x7b,
    0xfe, 0x34, 0x20, 0xf3, 0x11, 0xd8, 0x00, 0x06, 0x08, 0x1a, 0x13, 0x22, 0x23, 0x05, 0x20, 0xf9,
    0x3e, 0x19, 0xea, 0x10, 0x99, 0x21, 0x2f, 0x99, 0x0e, 0x0c, 0x3d, 0x28, 0x08, 0x32, 0x0d, 0x20,
    0xf9, 0x2e, 0x0f, 0x18, 0xf3, 0x67, 0x3e, 0x64, 0x57, 0xe0, 0x42, 0x3e, 0x91, 0xe0, 0x40, 0x04,
    0x1e, 0x02, 0x0e, 0x0c, 0xf0, 0x44, 0xfe, 0x90, 0x20, 0xfa, 0x0d, 0x20, 0xf7, 0x1d, 0x20, 0xf2,
    0x0e, 0x13, 0x24, 0x7c, 0x1e, 0x83, 0xfe, 0x62, 0x28, 0x06, 0x1e, 0xc1, 0xfe, 0x64, 0x20, 0x06,
    0x7b, 0xe2, 0x0c, 0x3e, 0x87, 0xe2, 0xf0, 0x42, 0x90, 0xe0, 0x42, 0x15, 0x20, 0xd2, 0x05, 0x20,
    0x4f, 0x16, 0x20, 0x18, 0xcb, 0x4f, 0x06, 0x04, 0xc5, 0xcb, 0x11, 0x17, 0xc1, 0xcb, 0x11, 0x17,
    0x05, 0x20, 0xf5, 0x22, 0x23, 0x22, 0x23, 0xc9, 0xce, 0xed, 0x66, 0x66, 0xcc, 0x0d, 0x00, 0x0b,
    0x03, 0x73, 0x00, 0x83, 0x00, 0x0c, 0x00, 0x0d, 0x00, 0x08, 0x11, 0x1f, 0x88, 0x89, 0x00, 0x0e,
    0xdc, 0xcc, 0x6e, 0xe6, 0xdd, 0xdd, 0xd9, 0x99, 0xbb, 0xbb, 0x67, 0x63, 0x6e, 0x0e, 0xec, 0xcc,
    0xdd, 0xdc, 0x99, 0x9f, 0xbb, 0xb9, 0x33, 0x3e, 0x3c, 0x42, 0xb9, 0xa5, 0xb9, 0xa5, 0x42, 0x3c,
    0x21, 0x04, 0x01, 0x11, 0xa8, 0x00, 0x1a, 0x13, 0xbe, 0x20, 0xfe, 0x23, 0x7d, 0xfe, 0x34, 0x20,
    0xf5, 0x06, 0x19, 0x78, 0x86, 0x23, 0x05, 0x20, 0xfb, 0x86, 0x20, 0xfe, 0x3e, 0x01, 0xe0, 0x50,
]

const enum MBCType {
    NONE = "None",
    MBC1 = "MBC1",
    MBC2 = "MBC2",
    MBC3 = "MBC3",
    MBC5 = "MBC5",
    MBC6 = "MBC6",
    MBC7 = "MBC7",
    MMM01 = "MMM01",
}

const enum MBCMode {
    ROM = "ROM",
    RAM = "RAM",
}

export default class Memory {
    hasBoot: boolean;
    workRam: number[];
    videoRam: number[];
    externalRom: number[];
    externalRomBank: number;
    externalRam: number[]
    externalRamBank: number;
    externalRamEnabled: boolean;
    highRam: number[];
    mbcMode: MBCMode;
    
    IE: number;
    IF: number;

    constructor()
    {
        this.hasBoot = false;
        this.workRam = [];
        this.videoRam = [];
        this.externalRom = [];
        this.externalRomBank = 1;
        this.externalRam = [];
        this.externalRamBank = 0;
        this.externalRamEnabled = false;
        this.highRam = [];
        this.IE = 0;
        this.IF = 0;

        this.mbcMode = MBCMode.ROM;
    }

    // https://gbdev.gg8.se/wiki/articles/Memory_Bank_Controllers
    read(address: number): number
    {
        address = address & 0xFFFF;
        
        let value: number;

        if (address < 0x4000) {
            if (this.hasBoot && address < 0x100) {
                value = BootRom[address];
            } else {
                value = this.externalRom[address];
            }
        } else if (address < 0x8000) {
            value = this.externalRom[address - 0x8000 + (0x8000 * this.externalRomBank)];
        } else if (address < 0xA000) {
            value = this.videoRam[address - 0x8000];
        } else if (address < 0xC000) {
            if (this.externalRamEnabled) {
                value = this.externalRam[address - 0xA000 + (0x2000 * this.externalRamBank)];
            } else {
                value = 0xff; // random online sources tell me so.
            }
        } else if (address < 0xE000) {
            value = this.workRam[address - 0xC000];
        } else if (address < 0xFE00) {
            value = this.workRam[address - 0xE000];
        } else if (address < 0xFEA0) {
            value = this.videoRam[address - 0xFE00];
        } else if (address < 0xFF00) {
            value = 0;
        } else if (address < 0xFF80) {
            switch (address) {
                case 0xFF0F:
                    value = this.IF & 0x1F;
                    break;
            }
        } else if (address < 0xFFFF) {
            value = this.highRam[address - 0xFF80];
        } else {
            value = this.IE & 0x1F;
        }

        return (value || 0) & 0xff;
    }

    write(address: number, value: number): void
    {
        address = address & 0xFFFF;
        value = value & 0xFF;

        if (address < 0x2000) {
            this.externalRamEnabled = (value & 0xF) == 0xA;
        } else if (address < 0x4000) {
            // only MMC
            let bank = value & 0b11111;
            
            if (bank == 0) {
                bank = 1;
            }

            this.externalRomBank = this.externalRomBank & 0b1100000 + bank;
        } else if (address < 0x6000) {
            let bank = value & 0b11;
            switch(this.mbcMode) {
                case MBCMode.ROM:
                    this.externalRomBank = (bank << 5) + this.externalRomBank & 0b11111;
                    break;
                case MBCMode.RAM:
                    this.externalRamBank = bank;
                    break;
                default:
                    break;
            }
        } else if (address < 0x8000) {
            this.mbcMode = (value & 0b1) == 0b1 ? MBCMode.RAM : MBCMode.ROM;
        } else if (address < 0xA000) {
            this.videoRam[address - 0x8000] = value;
        } else if (address < 0xC000) {
            if (this.externalRamEnabled) {
                this.externalRam[address - 0xA000 + (0x2000 * this.externalRamBank)] = value;
            }
        } else if (address < 0xE000) {
            this.workRam[address - 0xC000] = value;
        } else if (address < 0xFE00) {
            this.workRam[address - 0xE000] = value;
        } else if (address < 0xFEA0) {
            this.videoRam[address - 0xFE00] = value;
        } else if (address < 0xFF00) {
            // no-op
        } else if (address < 0xFF80) {
            switch (address) {
                case 0xFF0F:
                    this.IF = value;
                    break;
            }
        } else if (address < 0xFFFF) {
            this.highRam[address - 0xFF80] = value;
        } else {
            this.IE = value;
        }
    }
}