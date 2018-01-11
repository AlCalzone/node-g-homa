# Protokoll:
# Prefix (5a a5), Anzahl Nutzbytes (2 Byte), Payload, Checksumme (FF - LowByte der Summe aller Payloadbytes), Postfix (5b b5)
# Antwort von Dose hat immer die letzen 3 Bloecke der MAC vom 11-13 Byte
#
# Payload immer in "|"
#
#Init1 (vom Server):
# 5a a5 00 07|02 05 0d 07 05 07 12|c6 5b b5
#                ** ** ** ** ** **                                                                                                      ** scheinen zufaellig zu sein
# 5a a5 00 01|02|fd 5b b5
#Antwort auf Init1 von Dose:
# 5A A5 00 0B|03 01 0A C0 32 23 62 8A 7E 01 C2|AF 5B B5
#                               MM MM MM    **                                                                          MM: letzte 3 Stellen der MAC, ** scheinbar eine Checksumme basierend auf den 6 zufaelligen Bytes von Init1
#                         ?? ??                                                     ??: Unterschiedlich bei verschiedenen Steckermodellen
#Init2 (vom Server):
# 5a a5 00 02|05 01|f9 5b b5
#Antwort auf Init2 von Dose:
# 5A A5 00 12|07 01 0A C0 32 23 62 8A 7E 00 01 06 AC CF 23 62 8A 7E|5F 5B B5
#                               MM MM MM                                                                                        MM: letzte 3 Stellen der MAC
#                                                 MM MM MM MM MM MM                                     MM: komplette MAC
#                         ?? ??                                                     ??: Unterschiedlich bei verschiedenen Steckermodellen
# 5A A5 00 12|07 01 0A C0 32 23 62 8A 7E 00 02 05 00 01 01 08 11|4C 5B B5                       Anzahl Bytes stimmt nicht! ist aber immer so
#                                                       FF FF FF                                        FF: Firmware Version
# 5A A5 00 15|90 01 0A E0 32 23 62 8A 7E 00 00 00 81 11 00 00 01 00 00 00 00|32 5B B5           Status der Dose (wird auch immer bei Zustandsaenderung geschickt)
#                               MM MM MM                                                                                        MM: letzte 3 Stellen der MAC
#                                                 qq                                                            qq: Schaltquelle        81=lokal geschaltet, 11=remote geschaltet
#                                                                         oo            oo: Schaltzustand       ff=an, 00=aus
#                         ?? ??                                                     ??: Unterschiedlich bei verschiedenen Steckermodellen
# Danach kommt alle x Sekunden ein Heartbeat von der Dose:
# 5A A5 00 09|04 01 0A C0 32 23 62 8A 7E|71 5B B5
#                               MM MM MM
#                         ?? ??                                                     ??: Unterschiedlich bei verschiedenen Steckermodellen
# Antwort vom Server (wenn die nicht kommt blinkt Dose wieder und muss neu initialisiert werden):
# 5a a5 00 01|06|f9 5b b5
#---------------------------------------------------------------------------------------------------------
# Einschalten der Dose:
# 5a a5 00 17|10 01 01 0a e0 32 23 62 8a 7e ff fe 00 00 10 11 00 00 01 00 00 00 ff|26 5b b5
#                                  MM MM MM
#                            ?? ??                                                     ??: Unterschiedlich bei verschiedenen Steckermodellen
# Ausschalten der Dose
# 5a a5 00 17|10 01 01 0a e0 32 23 62 8a 7e ff fe 00 00 10 11 00 00 01 00 00 00 00|25 5b b5
#                                  MM MM MM
#                            ?? ??                                                     ??: Unterschiedlich bei verschiedenen Steckermodellen
# beides wird quittiert (ebenso wird auch bei lokaler betaetigung quittiert) -> siehe 3. Antwort auf Init 2
#---------------------------------------------------------------------------------------------------------
# Bei Dosen mit Verbrauchsdaten:
# 5A A5 00 16|90 01 0a e0 35 23 d3 48 d4 ff fe 01 81 39 00 00 01 03 20 00 56 9b|70 5b b5        Verbrauchsdaten
#                         ?? ?? MM MM MM
#                                                                id                   
# id: Art der Daten 01 = Leistung, 02 = Energie, 03 = Spannung, 04 = Strom, 05 = Frequenz, 07 = maxpower, 08 = Cosphi
#                                                                      VV VV VV   VV: Verbrauchswerte (muss durch 100 geteilt werden)

Mit Verbrauch:
==============

5aa5 0009 04 010ac0 3523 d323da 08 5bb5
5aa5 0001 06 f9 5bb5
5aa5 0009 04 010ac0 3523 d323da 08 5bb5
5aa5 0001 06 f9 5bb5
5aa5 0016 90 010ae0 3523 d323da fffe018139000001 0120001c2a 3c 5bb5
5aa5 0016 90 010ae0 3523 d323da fffe018139000001 0820000031 4a 5bb5
5aa5 0009 04 010ac0 3523 d323da 08 5bb5
5aa5 0001 06 f9 5bb5
5aa5 0016 90 010ae0 3523 d323da fffe018139000001 0120001d0b 5a 5bb5
5aa5 0016 90 010ae0 3523 d323da fffe018139000001 0820000032 49 5bb5
5aa5 0009 04 010ac0 3523 d323da 08 5bb5
5aa5 0001 06 f9 5bb5
5aa5 0009 04 010ac0 3523 d323da 08 5bb5
5aa5 0001 06 f9 5bb5
5aa5 0009 04 010ac0 3523 d323da 08 5bb5
5aa5 0001 06 f9 5bb5
5aa5 0009 04 010ac0 3523 d323da 08 5bb5
5aa5 0001 06 f9 5bb5
5aa5 0016 90 010ae0 3523 d323da fffe018139000001 0120001c07 5f 5bb5
5aa5 0016 90 010ae0 3523 d323da fffe018139000001 0820000030 4b 5bb5
5aa5 0016 90 010ae0 3523 d323da fffe018139000001 032000580b 1d 5bb5
5aa5 0009 04 010ac0 3523 d323da 08 5bb5
5aa5 0001 06 f9 5bb5
5aa5 0009 04 010ac0 3523 d323da 08 5bb5
5aa5 0001 06 f9 5bb5
5aa5 0009 04 010ac0 3523 d323da 08 5bb5
5aa5 0001 06 f9 5bb5
5aa5 0009 04 010ac0 3523 d323da 08 5bb5
5aa5 0001 06 f9 5bb5
5aa5 0009 04 010ac0 3523 d323da 08 5bb5
5aa5 0001 06 f9 5bb5
5aa5 0009 04 010ac0 3523 d323da 08 5bb5
5aa5 0001 06 f9 5bb5
5aa5 0009 04 010ac0 3523 d323da 08 5bb5
5aa5 0001 06 f9 5bb5
5aa5 0014 07 010ac0 3523 d323da 00030807df0509050a3802 bd 5bb5
5aa5 0009 04 010ac0 3523 d323da 08 5bb5
5aa5 0001 06 f9 5bb5
5aa5 0009 04 010ac0 3523 d323da 08 5bb5
5aa5 0001 06 f9 5bb5
5aa5 0009 04 010ac0 3523 d323da 08 5bb5
5aa5 0001 06 f9 5bb5
5aa5 0009 04 010ac0 3523 d323da 08 5bb5
5aa5 0001 06 f9 5bb5
5aa5 0009 04 010ac0 3523 d323da 08 5bb5
5aa5 0001 06 f9 5bb5
5aa5 0009 04 010ac0 3523 d323da 08 5bb5
5aa5 0001 06 f9 5bb5
5aa5 0009 04 010ac0 3523 d323da 08 5bb5
5aa5 0001 06 f9 5bb5
5aa5 0009 04 010ac0 3523 d323da 08 5bb5
5aa5 0001 06 f9 5bb5
5aa5 0009 04 010ac0 3523 d323da 08 5bb5
5aa5 0001 06 f9 5bb5
5aa5 0009 04 010ac0 3523 d323da 08 5bb5
5aa5 0001 06 f9 5bb5
5aa5 0009 04 010ac0 3523 d323da 08 5bb5
5aa5 0001 06 f9 5bb5
5aa5 0009 04 010ac0 3523 d323da 08 5bb5
5aa5 0001 06 f9 5bb5
5aa5 0009 04 010ac0 3523 d323da 08 5bb5
5aa5 0001 06 f9 5bb5
5aa5 0009 04 010ac0 3523 d323da 08 5bb5
5aa5 0001 06 f9 5bb5
5aa5 0009 04 010ac0 3523 d323da 08 5bb5
5aa5 0001 06 f9 5bb5
5aa5 0009 04 010ac0 3523 d323da 08 5bb5
5aa5 0001 06 f9 5bb5
5aa5 0009 04 010ac0 3523 d323da 08 5bb5
5aa5 0001 06 f9 5bb5
5aa5 0009 04 010ac0 3523 d323da 08 5bb5
5aa5 0001 06 f9 5bb5
5aa5 0009 04 010ac0 3523 d323da 08 5bb5
5aa5 0001 06 f9 5bb5
5aa5 0009 04 010ac0 3523 d323da 08 5bb5
5aa5 0001 06 f9 5bb5
5aa5 0009 04 010ac0 3523 d323da 08 5bb5
5aa5 0001 06 f9 5bb5
5aa5 0009 04 010ac0 3523 d323da 08 5bb5
5aa5 0001 06 f9 5bb5
5aa5 0009 04 010ac0 3523 d323da 08 5bb5
5aa5 0001 06 f9 5bb5
5aa5 0016 90 010ae0 3523 d323da fffe018139000001042000004738 5bb5
5aa5 0016 90 010ae0 3523 d323da fffe0181390000010720003e83bb 5bb5
5aa5 0016 90 010ae0 3523 d323da fffe018139000001082000002d4e 5bb5
5aa5 0009 04 010ac0 3523 d323da 08 5bb5
5aa5 0001 06 f9 5bb5
5aa5 0009 04 010ac0 3523 d323da 08 5bb5
5aa5 0001 06 f9 5bb5
5aa5 0009 04 010ac0 3523 d323da 08 5bb5
5aa5 0001 06 f9 5bb5
5aa5 0009 04 010ac0 3523 d323da 08 5bb5
5aa5 0001 06 f9 5bb5
5aa5 0009 04 010ac0 3523 d323da 08 5bb5
5aa5 0001 06 f9 5bb5
5aa5 0009 04 010ac0 3523 d323da 08 5bb5
5aa5 0001 06 f9 5bb5
5aa5 0009 04 010ac0 3523 d323da 08 5bb5
5aa5 0001 06 f9 5bb5
5aa5 0009 04 010ac0 3523 d323da 08 5bb5
5aa5 0001 06 f9 5bb5
5aa5 0009 04 010ac0 3523 d323da 08 5bb5
5aa5 0001 06 f9 5bb5
5aa5 0009 04 010ac0 3523 d323da 08 5bb5
5aa5 0001 06 f9 5bb5
5aa5 0009 04 010ac0 3523 d323da 08 5bb5
5aa5 0001 06 f9 5bb5
5aa5 0009 04 010ac0 3523 d323da 08 5bb5
5aa5 0001 06 f9 5bb5
5aa5 0016 90 010ae0 3523 d323da fffe0181390000010320005a6db9 5bb5
5aa5 0016 90 010ae0 3523 d323da fffe018139000001072000403408 5bb5
5aa5 0009 04 010ac0 3523 d323da 08 5bb5
5aa5 0001 06 f9 5bb5
5aa5 0016 90 010ae0 3523 d323da fffe018139000001082000002c4f 5bb5
5aa5 0009 04 010ac0 3523 d323da 08 5bb5
5aa5 0001 06 f9 5bb5
5aa5 0016 90 010ae0 3523 d323da fffe0181390000010520001386e5 5bb5
5aa5 0009 04 010ac0 3523 d323da 08 5bb5
5aa5 0001 06 f9 5bb5
5aa5 0009 04 010ac0 3523 d323da 08 5bb5
5aa5 0001 06 f9 5bb5