package com.kimanh.crm.service;

import com.kimanh.crm.entity.KhachHang;
import com.kimanh.crm.repository.KhachHangRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class KhachHangService {

    private final KhachHangRepository repository;

    public Page<KhachHang> findAll(String keyword, String status, String page, String sale, Pageable pageable) {
        String kw = (keyword != null && !keyword.isBlank()) ? keyword : null;
        String st = (status != null && !status.isBlank()) ? status : null;
        String pg = (page != null && !page.isBlank()) ? page : null;
        String sl = (sale != null && !sale.isBlank()) ? sale : null;
        Pageable unsorted = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());
        return repository.findWithFilters(kw, st, pg, sl, unsorted);
    }

    @Cacheable(value = "khachHang", key = "#id")
    public KhachHang findById(Long id) {
        return repository.findById(id).orElseThrow(() -> new RuntimeException("Khách hàng không tồn tại: " + id));
    }

    @Caching(evict = {
        @CacheEvict(value = "khachHang_pages", allEntries = true),
        @CacheEvict(value = "khachHang_sales", allEntries = true),
        @CacheEvict(value = "khachHang_count", allEntries = true)
    })
    public KhachHang create(KhachHang entity) {
        return repository.save(entity);
    }

    @Caching(evict = {
        @CacheEvict(value = "khachHang", key = "#id"),
        @CacheEvict(value = "khachHang_pages", allEntries = true),
        @CacheEvict(value = "khachHang_sales", allEntries = true)
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
        @CacheEvict(value = "khachHang_pages", allEntries = true),
        @CacheEvict(value = "khachHang_sales", allEntries = true),
        @CacheEvict(value = "khachHang_count", allEntries = true)
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
}
