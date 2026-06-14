package com.kimanh.crm.service;

import com.kimanh.crm.entity.NhanVien;
import com.kimanh.crm.repository.NhanVienRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class NhanVienService {

    private final NhanVienRepository repository;

    public List<NhanVien> findAll() {
        return repository.findAllByOrderByHoTenAsc();
    }

    public List<NhanVien> findActive() {
        return repository.findByTrangThaiTrueOrderByHoTenAsc();
    }

    public NhanVien create(NhanVien nv) {
        return repository.save(nv);
    }

    public NhanVien update(Long id, NhanVien data) {
        NhanVien nv = repository.findById(id)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy nhân viên: " + id));
        nv.setMaNv(data.getMaNv());
        nv.setHoTen(data.getHoTen());
        nv.setLoaiHopDong(data.getLoaiHopDong());
        nv.setChucVu(data.getChucVu());
        nv.setLuongCoBan(data.getLuongCoBan());
        nv.setNgayVaoLam(data.getNgayVaoLam());
        nv.setTrangThai(data.isTrangThai());
        nv.setCrmUserName(data.getCrmUserName());
        return repository.save(nv);
    }

    public NhanVien updateLuongCoBan(Long id, Long luong) {
        NhanVien nv = repository.findById(id)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy nhân viên: " + id));
        nv.setLuongCoBan(BigDecimal.valueOf(luong));
        return repository.save(nv);
    }

    public NhanVien toggleAnTrongBang(Long id) {
        NhanVien nv = repository.findById(id)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy nhân viên: " + id));
        nv.setAnTrongBang(!nv.isAnTrongBang());
        return repository.save(nv);
    }

    public void delete(Long id) {
        repository.deleteById(id);
    }
}
