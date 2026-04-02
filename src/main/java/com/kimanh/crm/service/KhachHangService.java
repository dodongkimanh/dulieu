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

        long totalMess = repository.countMessBySale(sale, fromDate, toDate);
        long totalPhones = repository.countDistinctSdtBySale(sale, fromDate, toDate);

        log.info("getMessStats: sale='{}', from={}, to={} → totalMess={}, totalPhones={}",
                sale, fromDate, toDate, totalMess, totalPhones);

        result.put("totalMess", totalMess);
        result.put("totalPhones", totalPhones);

        // Mess by day
        List<Object[]> messByDay = repository.countMessByDayForSale(sale, fromDate, toDate);
        List<Map<String, Object>> dayData = new ArrayList<>();
        for (Object[] row : messByDay) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("day", ((Number) row[0]).intValue());
            item.put("count", ((Number) row[1]).longValue());
            dayData.add(item);
        }
        result.put("messByDay", dayData);

        return result;
    }
}
