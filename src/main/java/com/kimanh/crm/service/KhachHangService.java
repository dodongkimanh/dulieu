package com.kimanh.crm.service;

import com.kimanh.crm.entity.KhachHang;
import com.kimanh.crm.repository.KhachHangRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class KhachHangService {

    private final KhachHangRepository repository;

    public Page<KhachHang> findAll(String keyword, String status, String page, String sale,
                                    LocalDate fromDate, LocalDate toDate,
                                    Boolean hasSdt, Boolean assignedOnly,
                                    Pageable pageable) {
        String kw = (keyword != null && !keyword.isBlank()) ? keyword : null;
        String st = (status != null && !status.isBlank()) ? status : null;
        String pg = (page != null && !page.isBlank()) ? page : null;
        String sl = (sale != null && !sale.isBlank()) ? sale : null;
        Pageable unsorted = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());
        return repository.findWithFilters(kw, st, pg, sl, fromDate, toDate, hasSdt, assignedOnly, unsorted);
    }

    @Cacheable(value = "khachHang", key = "#id")
    public KhachHang findById(Long id) {
        return repository.findById(id).orElseThrow(() -> new RuntimeException("Khách hàng không tồn tại: " + id));
    }

    @Caching(evict = {
        @CacheEvict(value = "khachHang_pages", allEntries = true),
        @CacheEvict(value = "khachHang_sales", allEntries = true),
        @CacheEvict(value = "khachHang_count", allEntries = true),
        @CacheEvict(value = "mess_stats", allEntries = true)
    })
    public KhachHang create(KhachHang entity) {
        return repository.save(entity);
    }

    @Caching(evict = {
        @CacheEvict(value = "khachHang", key = "#id"),
        @CacheEvict(value = "khachHang_pages", allEntries = true),
        @CacheEvict(value = "khachHang_sales", allEntries = true),
        @CacheEvict(value = "mess_stats", allEntries = true)
    })
    public KhachHang update(Long id, KhachHang data) {
        KhachHang existing = findById(id);
        existing.setNgayThang(data.getNgayThang());
        existing.setKhachHang(data.getKhachHang());
        existing.setSdt(data.getSdt());
        existing.setSale(data.getSale());
        existing.setMess(data.getMess());
        existing.setUid(data.getUid());
        existing.setAdId(data.getAdId());
        existing.setIdTrang(data.getIdTrang());
        existing.setPage(data.getPage());
        existing.setLoaiMess(data.getLoaiMess());
        existing.setStatus(data.getStatus());
        return repository.save(existing);
    }

    @Caching(evict = {
        @CacheEvict(value = "khachHang", key = "#id")
    })
    public KhachHang updateStatus(Long id, String status) {
        KhachHang existing = findById(id);
        existing.setStatus(status);
        return repository.save(existing);
    }

    @Caching(evict = {
        @CacheEvict(value = "khachHang", key = "#id"),
        @CacheEvict(value = "khachHang_sales", allEntries = true)
    })
    public KhachHang transferSale(Long id, String newSale) {
        KhachHang existing = findById(id);
        String oldSale = existing.getSale();
        existing.setAssignedFrom(oldSale);
        existing.setSale(newSale);
        existing.setStatus("moi");
        return repository.save(existing);
    }

    @Caching(evict = {
        @CacheEvict(value = "khachHang_sales", allEntries = true),
        @CacheEvict(value = "khachHang_count", allEntries = true),
        @CacheEvict(value = "mess_stats", allEntries = true)
    })
    public int bulkTransferSale(List<Long> ids, String newSale) {
        List<KhachHang> customers = repository.findAllById(ids);
        for (KhachHang kh : customers) {
            String oldSale = kh.getSale();
            kh.setAssignedFrom(oldSale);
            kh.setSale(newSale);
            kh.setStatus("moi");
        }
        repository.saveAll(customers);
        return customers.size();
    }

    @Caching(evict = {
        @CacheEvict(value = "khachHang", key = "#id")
    })
    public KhachHang updateNotes(Long id, String notes) {
        KhachHang existing = findById(id);
        existing.setMess(notes);
        return repository.save(existing);
    }

    @Caching(evict = {
        @CacheEvict(value = "khachHang", key = "#id")
    })
    public KhachHang updateLoaiMess(Long id, String loaiMess) {
        KhachHang existing = findById(id);
        existing.setLoaiMess(loaiMess);
        return repository.save(existing);
    }

    @Caching(evict = {
        @CacheEvict(value = "khachHang", key = "#id"),
        @CacheEvict(value = "khachHang_pages", allEntries = true),
        @CacheEvict(value = "khachHang_sales", allEntries = true),
        @CacheEvict(value = "khachHang_count", allEntries = true),
        @CacheEvict(value = "mess_stats", allEntries = true)
    })
    public void delete(Long id) {
        repository.deleteById(id);
    }

    public List<KhachHang> search(String keyword) {
        return repository.searchByNameOrPhone(keyword);
    }

    @Cacheable(value = "khachHang_count")
    public long count() {
        return repository.count();
    }

    public long countNewThisMonth() {
        OffsetDateTime startOfMonth = OffsetDateTime.now().withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0).withNano(0);
        return repository.countNewThisMonth(startOfMonth);
    }

    @Cacheable(value = "khachHang_pages")
    public List<String> getDistinctPages() {
        return repository.findDistinctPages();
    }

    @Cacheable(value = "khachHang_sales")
    public List<String> getDistinctSales() {
        return repository.findDistinctSales();
    }

    public long countPendingAssigned(String sale) {
        return repository.countPendingAssigned(sale);
    }

    // Sale dashboard: mess stats for a specific sale
    // Use individual queries (long return type) to avoid Object[] parsing issues across Hibernate versions
    @Cacheable(value = "mess_stats", key = "#sale + '_' + #fromDate + '_' + #toDate")
    public Map<String, Object> getMessStats(String sale, LocalDate fromDate, LocalDate toDate) {
        Map<String, Object> result = new LinkedHashMap<>();

        // Normalize sale name to NFC + collapse whitespace to match REGEXP_REPLACE(TRIM(Sale), '\s+', ' ') in SQL
        String normalizedSale = sale != null
                ? Normalizer.normalize(sale.trim().replaceAll("\\s+", " "), Normalizer.Form.NFC)
                : sale;

        long totalMess = repository.countMessBySale(normalizedSale, fromDate, toDate);
        long totalPhones = repository.countDistinctSdtBySale(normalizedSale, fromDate, toDate);

        // If NFC-normalized query returns 0, try NFD form (data might be stored in NFD)
        if (totalMess == 0 && sale != null) {
            String nfdSale = Normalizer.normalize(sale.trim(), Normalizer.Form.NFD);
            if (!nfdSale.equals(normalizedSale)) {
                long nfdMess = repository.countMessBySale(nfdSale, fromDate, toDate);
                if (nfdMess > 0) {
                    log.warn("Unicode mismatch detected for sale='{}': NFC returned 0 but NFD returned {}. Using NFD form.", sale, nfdMess);
                    totalMess = nfdMess;
                    totalPhones = repository.countDistinctSdtBySale(nfdSale, fromDate, toDate);
                    normalizedSale = nfdSale;
                }
            }
        }

        // If still 0, try TRIM-based fuzzy match via LIKE
        if (totalMess == 0 && sale != null) {
            long trimMess = repository.countMessBySaleTrimmed(sale.trim(), fromDate, toDate);
            if (trimMess > 0) {
                log.warn("Exact match returned 0 for sale='{}' but TRIM match returned {}. Possible trailing spaces or invisible chars.", sale, trimMess);
                totalMess = trimMess;
                totalPhones = repository.countDistinctSdtBySaleTrimmed(sale.trim(), fromDate, toDate);
            }
        }

        log.info("getMessStats: sale='{}', from={}, to={} → totalMess={}, totalPhones={}",
                sale, fromDate, toDate, totalMess, totalPhones);

        result.put("totalMess", totalMess);
        result.put("totalPhones", totalPhones);

        // Mess by day — use normalizedSale (resolved via NFC/NFD/TRIM fallback), NOT raw sale
        List<Object[]> messByDay = repository.countMessByDayForSale(normalizedSale, fromDate, toDate);
        // If empty, also try TRIM variant
        if (messByDay.isEmpty() && sale != null) {
            messByDay = repository.countMessByDayForSaleTrimmed(sale.trim(), fromDate, toDate);
        }
        List<Map<String, Object>> dayData = new ArrayList<>();
        for (Object[] row : messByDay) {
            // Hibernate 6 compatibility: native queries may wrap each row in an extra Object[]
            // e.g. row = Object[]{ Object[]{day_val, count_val} } instead of Object[]{day_val, count_val}
            Object col0, col1;
            if (row.length == 1 && row[0] instanceof Object[]) {
                Object[] inner = (Object[]) row[0];
                col0 = inner.length > 0 ? inner[0] : null;
                col1 = inner.length > 1 ? inner[1] : null;
            } else {
                col0 = row.length > 0 ? row[0] : null;
                col1 = row.length > 1 ? row[1] : null;
            }
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("day", col0 != null ? Integer.parseInt(col0.toString()) : 0);
            item.put("count", col1 != null ? Long.parseLong(col1.toString()) : 0L);
            dayData.add(item);
        }
        result.put("messByDay", dayData);

        return result;
    }
}
