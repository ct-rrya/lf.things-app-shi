import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, Share,
  Platform, useWindowDimensions, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import QRCode from 'react-native-qrcode-svg';
import { colors } from '../../styles/colors';
import Constants from 'expo-constants';

// ── Responsive helpers ─────────────────────────────────────────
function useResponsive() {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 768;
  const isWeb = Platform.OS === 'web';

  const hPad = isTablet || isWeb ? Math.min(width * 0.05, 40) : 14;
  const maxContentWidth = isWeb && width > 900 ? 860 : undefined;
  const headerTopPad = isWeb ? 16
    : Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8
    : 52;
  const fontScale = isTablet ? 1.1 : 1;

  // QR code size scales with screen
  const qrSize = isTablet ? 140 : 110;

  // Two-column card layout on wide screens
  const twoCol = isWeb && width >= 900;

  return { isTablet, isWeb, hPad, maxContentWidth, headerTopPad, fontScale, qrSize, twoCol };
}

// ── Category icon map ──────────────────────────────────────────
function getCategoryIcon(category) {
  switch (category) {
    case 'ID':
    case 'id':           return { icon: 'card',           color: '#5B8CFF' };
    case 'Keys':
    case 'keys':         return { icon: 'key',            color: '#E8A838' };
    case 'Laptop':
    case 'laptop':       return { icon: 'laptop',         color: '#6C63FF' };
    case 'Phone':
    case 'phone':        return { icon: 'phone-portrait', color: '#34C759' };
    case 'Water Bottle':
    case 'bottle':       return { icon: 'water',          color: '#32ADE6' };
    case 'Wallet':
    case 'wallet':       return { icon: 'wallet',         color: '#A2845E' };
    case 'Bag':
    case 'bag':          return { icon: 'bag',            color: '#FF6B6B' };
    case 'Watch':
    case 'watch':        return { icon: 'time',           color: '#636366' };
    case 'Headphones':
    case 'headphones':   return { icon: 'headset',        color: '#AF52DE' };
    default:             return { icon: 'cube',           color: colors.grape };
  }
}

export default function ItemDetail() {
  const { id } = useLocalSearchParams();
  const [item, setItem] = useState(null);
  const [scanEvents, setScanEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const qrRef = useRef();
  const router = useRouter();
  const r = useResponsive();

  useEffect(() => {
    fetchItem();
    fetchScanEvents();
  }, [id]);

  // ── LOGIC (unchanged) ──────────────────────────────────────────
  async function fetchItem() {
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      setItem(data);
    } catch (error) {
      Alert.alert('Error', error.message);
      router.back();
    } finally {
      setLoading(false);
    }
  }

  async function fetchScanEvents() {
    try {
      const { data, error } = await supabase
        .from('scan_events')
        .select('*')
        .eq('item_id', id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setScanEvents(data || []);
    } catch (error) {
      console.error('Error fetching scan events:', error);
    }
  }

  async function updateStatus(newStatus) {
    try {
      const { error } = await supabase
        .from('items')
        .update({ status: newStatus })
        .eq('id', id);
      if (error) throw error;
      setItem({ ...item, status: newStatus });
      Alert.alert('Success', `Item marked as ${newStatus}`);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  }

  async function deleteItem() {
    Alert.alert(
      'Delete Item',
      'Are you sure? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('items')
                .delete()
                .eq('id', id);
              if (error) throw error;
              Alert.alert('Success', 'Item deleted');
              router.back();
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  }

  function shareQRCode() {
    const base = Platform.OS === 'web'
      ? window.location.origin
      : Constants.expoConfig?.extra?.appUrl || process.env.EXPO_PUBLIC_APP_URL || 'http://localhost:8081';
    const token = item.qr_token || item.id;
    const url = `${base}/scan/${token}`;
    Share.share({ message: `Found my ${item.name}? Scan this link: ${url}`, url });
  }
  // ── END LOGIC ──────────────────────────────────────────────────

  function getStatusStyle(status) {
    switch (status) {
      case 'safe':      return { bg: 'rgba(76,175,130,0.1)',  border: 'rgba(76,175,130,0.25)',  text: '#2d8a5e' };
      case 'lost':      return { bg: 'rgba(208,8,3,0.1)',    border: 'rgba(208,8,3,0.2)',      text: colors.ember };
      case 'found':     return { bg: 'rgba(69,53,75,0.1)',   border: 'rgba(69,53,75,0.2)',     text: colors.grape };
      case 'recovered': return { bg: 'rgba(219,179,84,0.15)',border: 'rgba(219,179,84,0.35)',  text: '#8a6a10' };
      default:          return { bg: 'rgba(69,53,75,0.06)',  border: 'rgba(69,53,75,0.12)',    text: colors.grape };
    }
  }

  function getStatusIcon(status) {
    switch (status) {
      case 'safe':      return 'checkmark-circle-outline';
      case 'lost':      return 'alert-circle-outline';
      case 'found':     return 'search-outline';
      case 'recovered': return 'ribbon-outline';
      default:          return 'ellipse-outline';
    }
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!item) return null;

  function getBaseUrl() {
    if (Platform.OS === 'web') return window.location.origin;
    return Constants.expoConfig?.extra?.appUrl || process.env.EXPO_PUBLIC_APP_URL || 'http://localhost:8081';
  }

  const qrUrl = item.qr_token
    ? `${getBaseUrl()}/scan/${item.qr_token}`
    : `${getBaseUrl()}/scan/${item.id}`;
  const statusStyle = getStatusStyle(item.status);
  const { icon: catIcon, color: catColor } = getCategoryIcon(item.category);

  return (
    <View style={styles.container}>

      {/* ── HEADER ─────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: r.headerTopPad }]}>
        <View style={[
          styles.headerInner,
          { paddingHorizontal: r.hPad },
          r.maxContentWidth && { maxWidth: r.maxContentWidth, alignSelf: 'center', width: '100%' },
        ]}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={18} color={colors.custard} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text
              style={[styles.headerTitle, { fontSize: r.isTablet ? 18 : 16 }]}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            <Text style={[styles.headerSub, { fontSize: r.isTablet ? 12 : 10 }]}>
              Item Details
            </Text>
          </View>
          <View style={[styles.headerStatusPill, {
            backgroundColor: statusStyle.bg,
            borderColor: statusStyle.border,
          }]}>
            <Ionicons name={getStatusIcon(item.status)} size={10} color={statusStyle.text} />
            <Text style={[styles.headerStatusText, { color: statusStyle.text }]}>
              {item.status?.toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={[
          styles.content,
          { paddingHorizontal: r.hPad },
          r.maxContentWidth && { maxWidth: r.maxContentWidth, alignSelf: 'center', width: '100%' },
        ]}
        showsVerticalScrollIndicator={false}
      >

        {/* ── TWO-COL WRAPPER on wide screens ──────────────── */}
        <View style={r.twoCol ? styles.twoColWrap : styles.singleColWrap}>

          {/* ── LEFT COL (or full width on mobile) ─────────── */}
          <View style={[styles.col, r.twoCol && styles.colLeft]}>

            {/* Item Info Card */}
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={[
                  styles.itemIconWrap,
                  { width: r.isTablet ? 58 : 48, height: r.isTablet ? 58 : 48 },
                  item.status === 'lost'  ? styles.feedImgLost  :
                  item.status === 'found' ? styles.feedImgFound : styles.feedImgSafe,
                ]}>
                  <Ionicons
                    name={catIcon}
                    size={r.isTablet ? 28 : 22}
                    color={catColor}
                  />
                </View>
                <View style={styles.cardTopText}>
                  <Text
                    style={[styles.cardTitle, { fontSize: r.isTablet ? 17 : 15 }]}
                    numberOfLines={2}
                  >
                    {item.name}
                  </Text>
                  {item.category && (
                    <Text style={[styles.cardCategory, { fontSize: r.isTablet ? 12 : 10 }]}>
                      {item.category}
                    </Text>
                  )}
                </View>
              </View>

              {item.description && (
                <>
                  <View style={styles.cardDivider} />
                  <View style={styles.detailRow}>
                    <Ionicons name="document-text-outline" size={13} color="rgba(69,53,75,0.4)" />
                    <View style={styles.detailBody}>
                      <Text style={styles.label}>DESCRIPTION</Text>
                      <Text style={[styles.value, { fontSize: r.isTablet ? 13 : 12 }]}>
                        {item.description}
                      </Text>
                    </View>
                  </View>
                </>
              )}

              {item.last_location && (
                <>
                  <View style={styles.cardDivider} />
                  <View style={styles.detailRow}>
                    <Ionicons name="location-outline" size={13} color="rgba(69,53,75,0.4)" />
                    <View style={styles.detailBody}>
                      <Text style={styles.label}>LAST LOCATION</Text>
                      <Text style={[styles.value, { fontSize: r.isTablet ? 13 : 12 }]}>
                        {item.last_location}
                      </Text>
                    </View>
                  </View>
                </>
              )}

              <View style={styles.cardDivider} />
              <View style={styles.detailRow}>
                <Ionicons name="calendar-outline" size={13} color="rgba(69,53,75,0.4)" />
                <View style={styles.detailBody}>
                  <Text style={styles.label}>REGISTERED</Text>
                  <Text style={[styles.value, { fontSize: r.isTablet ? 13 : 12 }]}>
                    {new Date(item.created_at).toLocaleDateString('en-US', {
                      year: 'numeric', month: 'long', day: 'numeric',
                    })}
                  </Text>
                </View>
              </View>
            </View>

            {/* Scan Events Card - Show if item was found */}
            {scanEvents.length > 0 && (
              <View style={styles.card}>
                <Text style={[styles.sectionHeading, { fontSize: r.isTablet ? 11 : 10 }]}>
                  FOUND ACTIVITY
                </Text>
                {scanEvents.map((event, index) => (
                  <View key={event.id}>
                    {index > 0 && <View style={styles.cardDivider} />}
                    <View style={styles.scanEventItem}>
                      <View style={styles.scanEventHeader}>
                        <View style={[
                          styles.scanEventIcon,
                          event.action === 'turn_in' 
                            ? { backgroundColor: 'rgba(16,185,129,0.1)' }
                            : { backgroundColor: 'rgba(69,53,75,0.1)' }
                        ]}>
                          <Ionicons 
                            name={event.action === 'turn_in' ? 'business' : 'hand-right'} 
                            size={16} 
                            color={event.action === 'turn_in' ? '#10b981' : colors.grape} 
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.scanEventTitle}>
                            {event.action === 'turn_in' 
                              ? '🎉 Turned in to SSG Office' 
                              : '📱 Finder has your item'}
                          </Text>
                          <Text style={styles.scanEventTime}>
                            {new Date(event.created_at).toLocaleString()}
                          </Text>
                        </View>
                      </View>
                      
                      <View style={styles.scanEventDetails}>
                        <View style={styles.detailRow}>
                          <Ionicons name="person-outline" size={13} color="rgba(69,53,75,0.4)" />
                          <View style={styles.detailBody}>
                            <Text style={styles.label}>FINDER</Text>
                            <Text style={[styles.value, { fontSize: r.isTablet ? 13 : 12 }]}>
                              {event.finder_name || 'Anonymous'}
                            </Text>
                          </View>
                        </View>
                        
                        {event.finder_phone && (
                          <View style={styles.detailRow}>
                            <Ionicons name="call-outline" size={13} color="rgba(69,53,75,0.4)" />
                            <View style={styles.detailBody}>
                              <Text style={styles.label}>PHONE</Text>
                              <Text style={[styles.value, { fontSize: r.isTablet ? 13 : 12 }]}>
                                {event.finder_phone}
                              </Text>
                            </View>
                          </View>
                        )}
                        
                        {event.finder_contact && (
                          <View style={styles.detailRow}>
                            <Ionicons name="logo-facebook" size={13} color="rgba(69,53,75,0.4)" />
                            <View style={styles.detailBody}>
                              <Text style={styles.label}>CONTACT</Text>
                              <Text style={[styles.value, { fontSize: r.isTablet ? 13 : 12 }]}>
                                {event.finder_contact}
                              </Text>
                            </View>
                          </View>
                        )}
                        
                        {event.location_note && (
                          <View style={styles.detailRow}>
                            <Ionicons name="location-outline" size={13} color="rgba(69,53,75,0.4)" />
                            <View style={styles.detailBody}>
                              <Text style={styles.label}>LOCATION NOTE</Text>
                              <Text style={[styles.value, { fontSize: r.isTablet ? 13 : 12 }]}>
                                {event.location_note}
                              </Text>
                            </View>
                          </View>
                        )}
                      </View>
                      
                      {event.action === 'turn_in' && (
                        <View style={styles.scanEventNote}>
                          <Ionicons name="information-circle" size={14} color="#059669" />
                          <Text style={styles.scanEventNoteText}>
                            Pick up your item from the SSG Office during office hours
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Status Update Card */}
            <View style={styles.card}>
              <Text style={[styles.sectionHeading, { fontSize: r.isTablet ? 11 : 10 }]}>
                UPDATE STATUS
              </Text>
              <View style={styles.statusButtons}>

                <TouchableOpacity
                  style={[styles.statusBtn, item.status === 'safe' && styles.statusBtnSafe]}
                  onPress={() => updateStatus('safe')}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={r.isTablet ? 17 : 15}
                    color={item.status === 'safe' ? '#FFFFFF' : '#2d8a5e'}
                  />
                  <Text style={[
                    styles.statusBtnText,
                    item.status === 'safe' && styles.statusBtnTextActive,
                    { fontSize: r.isTablet ? 12 : 11 },
                  ]}>
                    Safe
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.statusBtn, item.status === 'lost' && styles.statusBtnLost]}
                  onPress={() => updateStatus('lost')}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name="alert-circle-outline"
                    size={r.isTablet ? 17 : 15}
                    color={item.status === 'lost' ? '#FFFFFF' : colors.ember}
                  />
                  <Text style={[
                    styles.statusBtnText,
                    item.status === 'lost' && styles.statusBtnTextActive,
                    { fontSize: r.isTablet ? 12 : 11 },
                  ]}>
                    Lost
                  </Text>
                </TouchableOpacity>

              </View>
            </View>

            {/* Delete */}
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={deleteItem}
              activeOpacity={0.85}
            >
              <Ionicons name="trash-outline" size={r.isTablet ? 18 : 16} color={colors.ember} />
              <Text style={[styles.deleteButtonText, { fontSize: r.isTablet ? 14 : 13 }]}>
                Delete Item
              </Text>
            </TouchableOpacity>

          </View>

          {/* ── RIGHT COL: QR card (stacks below on mobile) ─ */}
          <View style={[styles.col, r.twoCol && styles.colRight]}>

            <View style={styles.qrCard}>
              <View style={styles.qrCardHeader}>
                <View style={styles.qrCardIconWrap}>
                  <Ionicons
                    name="qr-code-outline"
                    size={r.isTablet ? 20 : 16}
                    color={colors.gold}
                  />
                </View>
                <View>
                  <Text style={[styles.qrTitle, { fontSize: r.isTablet ? 15 : 13 }]}>
                    QR Code
                  </Text>
                  <Text style={[styles.qrSubtitle, { fontSize: r.isTablet ? 12 : 10 }]}>
                    Print and attach to your item
                  </Text>
                </View>
              </View>

              {/* QR + info row — stacks vertically inside right col on wide screens */}
              <View style={[
                styles.qrCodeArea,
                r.twoCol && styles.qrCodeAreaStacked,
              ]}>
                <View style={styles.qrWrapper}>
                  <QRCode
                    value={qrUrl}
                    size={r.qrSize}
                    getRef={qrRef}
                    backgroundColor="#FFFFFF"
                    color={colors.grape}
                  />
                </View>

                <View style={[styles.qrInfo, r.twoCol && styles.qrInfoStacked]}>
                  <Text style={[styles.qrInfoText, { fontSize: r.isTablet ? 12 : 10 }]}>
                    Whoever finds this item scans the QR — you get notified instantly. No app required for the finder.
                  </Text>
                  <View style={styles.qrActions}>
                    <TouchableOpacity
                      style={styles.qrBtnPrint}
                      onPress={() => {
                        if (Platform.OS === 'web') {
                          window.print();
                        } else {
                          // On mobile, share the QR URL as fallback
                          shareQRCode();
                        }
                      }}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="print-outline" size={r.isTablet ? 14 : 12} color={colors.ember} />
                      <Text style={[styles.qrBtnPrintText, { fontSize: r.isTablet ? 12 : 10 }]}>
                        Print
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.qrBtnShare}
                      onPress={shareQRCode}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="share-outline" size={r.isTablet ? 14 : 12} color={colors.grape} />
                      <Text style={[styles.qrBtnShareText, { fontSize: r.isTablet ? 12 : 10 }]}>
                        Share
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>

          </View>
        </View>

        <View style={{ height: 24 }} />

      </ScrollView>
    </View>
  );
}

// ── STYLES ──────────────────────────────────────────────────────
const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#F2EAD0',
  },

  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2EAD0',
  },
  loadingText: {
    fontSize: 13,
    color: colors.grape,
    opacity: 0.45,
  },

  // ── Header ──
  header: {
    backgroundColor: colors.grape,
    paddingBottom: 18,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(222,207,157,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(222,207,157,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontWeight: '700',
    color: colors.custard,
    letterSpacing: 0.3,
  },
  headerSub: {
    color: 'rgba(222,207,157,0.45)',
    marginTop: 1,
  },
  headerStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    flexShrink: 0,
  },
  headerStatusText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // ── Body ──
  body: { flex: 1 },
  content: {
    paddingTop: 14,
    paddingBottom: 20,
    gap: 10,
  },

  // ── Layout columns ──
  singleColWrap: {
    gap: 10,
  },
  twoColWrap: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-start',
  },
  col: {
    gap: 10,
  },
  colLeft: {
    flex: 1.2,
    minWidth: 0,
  },
  colRight: {
    flex: 1,
    minWidth: 280,
  },

  // ── Card ──
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(69,53,75,0.08)',
    shadowColor: colors.grape,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 2,
  },
  itemIconWrap: {
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  feedImgLost:  { backgroundColor: 'rgba(208,8,3,0.07)' },
  feedImgFound: { backgroundColor: 'rgba(69,53,75,0.07)' },
  feedImgSafe:  { backgroundColor: 'rgba(219,179,84,0.12)' },
  cardTopText: { flex: 1 },
  cardTitle: {
    fontWeight: '700',
    color: colors.grape,
    marginBottom: 3,
    lineHeight: 22,
  },
  cardCategory: {
    color: 'rgba(69,53,75,0.45)',
    fontWeight: '500',
  },
  cardDivider: {
    height: 1,
    backgroundColor: 'rgba(69,53,75,0.06)',
    marginVertical: 10,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  detailBody: { flex: 1 },
  label: {
    fontSize: 9,
    color: 'rgba(69,53,75,0.45)',
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  value: {
    color: colors.grape,
    lineHeight: 18,
  },

  // ── QR Card ──
  qrCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(219,179,84,0.3)',
    shadowColor: colors.grape,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  qrCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  qrCardIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: 'rgba(219,179,84,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(219,179,84,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  qrTitle: {
    fontWeight: '700',
    color: colors.grape,
  },
  qrSubtitle: {
    color: 'rgba(69,53,75,0.45)',
    marginTop: 1,
  },
  qrCodeArea: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  qrCodeAreaStacked: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  qrWrapper: {
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(69,53,75,0.1)',
    flexShrink: 0,
    alignSelf: 'flex-start',
  },
  qrInfo: { flex: 1 },
  qrInfoStacked: {
    flex: 0,
    width: '100%',
    marginTop: 12,
  },
  qrInfoText: {
    color: 'rgba(69,53,75,0.5)',
    lineHeight: 16,
    marginBottom: 10,
  },
  qrActions: {
    flexDirection: 'row',
    gap: 6,
  },
  qrBtnPrint: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(208,8,3,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(208,8,3,0.15)',
    paddingVertical: 8,
    borderRadius: 8,
  },
  qrBtnPrintText: {
    fontWeight: '700',
    color: colors.ember,
  },
  qrBtnShare: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(69,53,75,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(69,53,75,0.12)',
    paddingVertical: 8,
    borderRadius: 8,
  },
  qrBtnShareText: {
    fontWeight: '700',
    color: colors.grape,
  },

  // ── Status Update ──
  sectionHeading: {
    fontWeight: '700',
    color: 'rgba(69,53,75,0.5)',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  
  // ── Scan Events ──
  scanEventItem: {
    gap: 10,
  },
  scanEventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  scanEventIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  scanEventTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.grape,
    marginBottom: 2,
  },
  scanEventTime: {
    fontSize: 10,
    color: 'rgba(69,53,75,0.45)',
  },
  scanEventDetails: {
    gap: 8,
    paddingLeft: 46,
  },
  scanEventNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(5,150,105,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(5,150,105,0.2)',
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
  },
  scanEventNoteText: {
    flex: 1,
    fontSize: 11,
    color: '#059669',
    lineHeight: 16,
    fontWeight: '500',
  },
  
  statusButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(69,53,75,0.15)',
    backgroundColor: '#FFFFFF',
  },
  statusBtnSafe:      { backgroundColor: '#2d8a5e', borderColor: '#2d8a5e' },
  statusBtnLost:      { backgroundColor: colors.ember, borderColor: colors.ember },
  statusBtnRecovered: { backgroundColor: '#8a6a10', borderColor: '#8a6a10' },
  statusBtnText: {
    fontWeight: '600',
    color: colors.grape,
  },
  statusBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // ── Delete ──
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(208,8,3,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(208,8,3,0.2)',
    padding: 14,
    borderRadius: 12,
  },
  deleteButtonText: {
    color: colors.ember,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

});