##############################################
# $Id$
#
# Protokoll:
# Prefix (5a a5), Anzahl Nutzbytes (2 Byte), Payload, Checksumme (FF - LowByte der Summe aller Payloadbytes), Postfix (5b b5)
# Antwort von Dose hat immer die letzen 3 Bloecke der MAC vom 11-13 Byte
#
# Payload immer in "|"
# Init1 (vom Server):
# 5a a5 00 07|02 05 0d 07 05 07 12|c6 5b b5
#                ** ** ** ** ** **													** scheinen zufaellig zu sein
# 5a a5 00 01|02|fd 5b b5
# Antwort auf Init1 von Dose:
# 5A A5 00 0B|03 01 0A C0 32 23 62 8A 7E 01 C2|AF 5B B5
#                               MM MM MM    **										MM: letzte 3 Stellen der MAC, ** scheinbar eine Checksumme basierend auf den 6 zufaelligen Bytes von Init1
# Init2 (vom Server):
# 5a a5 00 02|05 01|f9 5b b5
# Antwort auf Init2 von Dose:
# 5A A5 00 12|07 01 0A C0 32 23 62 8A 7E 00 01 06 AC CF 23 62 8A 7E|5F 5B B5
#                               MM MM MM											MM: letzte 3 Stellen der MAC
#                                                 MM MM MM MM MM MM					MM: komplette MAC
# 5A A5 00 12|07 01 0A C0 32 23 62 8A 7E 00 02 05 00 01 01 08 11|4C 5B B5    			Anzahl Bytes stimmt nicht! ist aber immer so
# 5A A5 00 15|90 01 0A E0 32 23 62 8A 7E 00 00 00 81 11 00 00 01 00 00 00 00|32 5B B5		Status der Dose (wird auch immer bei Zustandsaenderung geschickt)
#                               MM MM MM											MM: letzte 3 Stellen der MAC
#                                                 qq								qq: Schaltquelle 	81=lokal geschaltet, 11=remote geschaltet
#                                                                         oo 		oo: Schaltzustand	ff=an, 00=aus
# Danach kommt alle x Sekunden ein Heartbeat von der Dose:
# 5A A5 00 09|04 01 0A C0 32 23 62 8A 7E|71 5B B5
#                               MM MM MM
# Antwort vom Server (wenn die nicht kommt blinkt Dose wieder und muss neu initialisiert werden):
# 5a a5 00 01|06|f9 5b b5
#---------------------------------------------------------------------------------------------------------
# Einschalten der Dose:
# 5a a5 00 17|10 01 01 0a e0 32 23 62 8a 7e ff fe 00 00 10 11 00 00 01 00 00 00 ff|26 5b b5
#                                  MM MM MM
# Ausschalten der Dose
# 5a a5 00 17|10 01 01 0a e0 32 23 62 8a 7e ff fe 00 00 10 11 00 00 01 00 00 00 00|25 5b b5
#                                  MM MM MM
# beides wird quittiert (ebenso wird auch bei lokaler betaetigung quittiert) -> siehe 3. Antwort auf Init 2