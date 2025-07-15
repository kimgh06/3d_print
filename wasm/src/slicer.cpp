#include <emscripten/bind.h>
#include <emscripten/val.h>
#include <string>
#include <vector>
#include <cmath>
#include <sstream>

using namespace emscripten;

// 3D 벡터 구조체
struct Vector3 {
    double x, y, z;
    Vector3(double x = 0, double y = 0, double z = 0) : x(x), y(y), z(z) {}
};

// 삼각형 구조체
struct Triangle {
    Vector3 v1, v2, v3;
    Triangle(Vector3 v1, Vector3 v2, Vector3 v3) : v1(v1), v2(v2), v3(v3) {}
};

// 레이어 구조체
struct Layer {
    double height;
    std::vector<std::vector<Vector3>> contours;
    std::vector<std::vector<Vector3>> infill;
    
    Layer(double h) : height(h) {}
};

// 간단한 3D 슬라이서 클래스
class SimpleSlicer {
private:
    std::vector<Triangle> triangles;
    double layerHeight;
    double infillDensity;
    
public:
    SimpleSlicer() : layerHeight(0.2), infillDensity(20.0) {}
    
    // 설정 메서드
    void setLayerHeight(double height) { layerHeight = height; }
    void setInfillDensity(double density) { infillDensity = density; }
    
    // STL 파일 파싱 (간단한 버전)
    bool parseSTL(const std::string& stlData) {
        // 실제 구현에서는 STL 바이너리/ASCII 파싱
        // 여기서는 간단한 예시만 구현
        triangles.clear();
        
        // 간단한 큐브 모델 생성 (테스트용)
        createTestCube();
        return true;
    }
    
    // 테스트용 큐브 생성
    void createTestCube() {
        double size = 10.0;
        Vector3 p1(-size/2, -size/2, -size/2);
        Vector3 p2(size/2, -size/2, -size/2);
        Vector3 p3(size/2, size/2, -size/2);
        Vector3 p4(-size/2, size/2, -size/2);
        Vector3 p5(-size/2, -size/2, size/2);
        Vector3 p6(size/2, -size/2, size/2);
        Vector3 p7(size/2, size/2, size/2);
        Vector3 p8(-size/2, size/2, size/2);
        
        // 큐브의 12개 삼각형
        triangles = {
            Triangle(p1, p2, p3), Triangle(p1, p3, p4), // 아래면
            Triangle(p5, p6, p7), Triangle(p5, p7, p8), // 위면
            Triangle(p1, p2, p6), Triangle(p1, p6, p5), // 앞면
            Triangle(p3, p4, p8), Triangle(p3, p8, p7), // 뒷면
            Triangle(p2, p3, p7), Triangle(p2, p7, p6), // 오른쪽면
            Triangle(p1, p4, p8), Triangle(p1, p8, p5)  // 왼쪽면
        };
    }
    
    // 모델의 바운딩 박스 계산
    std::vector<double> getBoundingBox() {
        if (triangles.empty()) return {0, 0, 0, 0, 0, 0};
        
        double minX = triangles[0].v1.x, maxX = triangles[0].v1.x;
        double minY = triangles[0].v1.y, maxY = triangles[0].v1.y;
        double minZ = triangles[0].v1.z, maxZ = triangles[0].v1.z;
        
        for (const auto& tri : triangles) {
            minX = std::min(minX, std::min(tri.v1.x, std::min(tri.v2.x, tri.v3.x)));
            maxX = std::max(maxX, std::max(tri.v1.x, std::max(tri.v2.x, tri.v3.x)));
            minY = std::min(minY, std::min(tri.v1.y, std::min(tri.v2.y, tri.v3.y)));
            maxY = std::max(maxY, std::max(tri.v1.y, std::max(tri.v2.y, tri.v3.y)));
            minZ = std::min(minZ, std::min(tri.v1.z, std::min(tri.v2.z, tri.v3.z)));
            maxZ = std::max(maxZ, std::max(tri.v1.z, std::max(tri.v2.z, tri.v3.z)));
        }
        
        return {minX, minY, minZ, maxX, maxY, maxZ};
    }
    
    // 레이어별 슬라이싱
    std::vector<Layer> slice() {
        std::vector<Layer> layers;
        auto bbox = getBoundingBox();
        double minZ = bbox[2];
        double maxZ = bbox[5];
        
        // 레이어 높이별로 슬라이싱
        for (double z = minZ; z <= maxZ; z += layerHeight) {
            Layer layer(z);
            
            // 현재 레이어에서 삼각형과의 교차점 계산
            std::vector<Vector3> intersections;
            
            for (const auto& tri : triangles) {
                // 삼각형이 현재 레이어와 교차하는지 확인
                if ((tri.v1.z <= z && z <= tri.v2.z) || 
                    (tri.v2.z <= z && z <= tri.v3.z) || 
                    (tri.v3.z <= z && z <= tri.v1.z)) {
                    
                    // 교차점 계산 (간단한 선형 보간)
                    Vector3 intersection = calculateIntersection(tri, z);
                    intersections.push_back(intersection);
                }
            }
            
            // 교차점들을 윤곽선으로 구성
            if (!intersections.empty()) {
                layer.contours.push_back(intersections);
                
                // 인필 패턴 생성
                layer.infill = generateInfill(intersections, z);
            }
            
            layers.push_back(layer);
        }
        
        return layers;
    }
    
    // 삼각형과 평면의 교차점 계산
    Vector3 calculateIntersection(const Triangle& tri, double z) {
        // 간단한 선형 보간
        double t1 = (z - tri.v1.z) / (tri.v2.z - tri.v1.z);
        double t2 = (z - tri.v2.z) / (tri.v3.z - tri.v2.z);
        
        Vector3 p1(tri.v1.x + t1 * (tri.v2.x - tri.v1.x),
                   tri.v1.y + t1 * (tri.v2.y - tri.v1.y),
                   z);
        
        Vector3 p2(tri.v2.x + t2 * (tri.v3.x - tri.v2.x),
                   tri.v2.y + t2 * (tri.v3.y - tri.v2.y),
                   z);
        
        return Vector3((p1.x + p2.x) / 2, (p1.y + p2.y) / 2, z);
    }
    
    // 인필 패턴 생성
    std::vector<std::vector<Vector3>> generateInfill(const std::vector<Vector3>& contour, double z) {
        std::vector<std::vector<Vector3>> infill;
        
        // 간단한 직선 인필 패턴
        auto bbox = getBoundingBox();
        double minX = bbox[0], maxX = bbox[3];
        double minY = bbox[1], maxY = bbox[4];
        
        double spacing = 2.0; // 인필 간격
        double density = infillDensity / 100.0;
        
        for (double x = minX; x <= maxX; x += spacing / density) {
            std::vector<Vector3> line;
            line.push_back(Vector3(x, minY, z));
            line.push_back(Vector3(x, maxY, z));
            infill.push_back(line);
        }
        
        return infill;
    }
    
    // G-code 생성
    std::string generateGCode() {
        auto layers = slice();
        std::stringstream gcode;
        
        gcode << "; Generated by WASM Slicer\n";
        gcode << "; Layer height: " << layerHeight << "mm\n";
        gcode << "; Infill density: " << infillDensity << "%\n\n";
        
        gcode << "G21 ; Set units to mm\n";
        gcode << "G90 ; Absolute positioning\n";
        gcode << "M82 ; Extruder absolute mode\n\n";
        
        double e = 0.0; // 압출량
        
        for (size_t i = 0; i < layers.size(); i++) {
            const auto& layer = layers[i];
            
            gcode << "; Layer " << i << " at Z=" << layer.height << "\n";
            
            // 윤곽선 출력
            for (const auto& contour : layer.contours) {
                if (contour.empty()) continue;
                
                gcode << "G0 Z" << layer.height << " F1200\n";
                gcode << "G0 X" << contour[0].x << " Y" << contour[0].y << " F3000\n";
                
                for (size_t j = 1; j < contour.size(); j++) {
                    e += 0.1; // 간단한 압출량 계산
                    gcode << "G1 X" << contour[j].x << " Y" << contour[j].y << " E" << e << " F1800\n";
                }
            }
            
            // 인필 출력
            for (const auto& infillLine : layer.infill) {
                if (infillLine.size() < 2) continue;
                
                gcode << "G0 Z" << layer.height << " F1200\n";
                gcode << "G0 X" << infillLine[0].x << " Y" << infillLine[0].y << " F3000\n";
                
                e += 0.05;
                gcode << "G1 X" << infillLine[1].x << " Y" << infillLine[1].y << " E" << e << " F1800\n";
            }
        }
        
        gcode << "\nG0 Z" << (layers.back().height + 10) << " F1200\n";
        gcode << "M84 ; Disable steppers\n";
        
        return gcode.str();
    }
    
    // JSON 형태로 레이어 정보 반환
    std::string getLayerInfo() {
        auto layers = slice();
        std::stringstream json;
        
        json << "{\n";
        json << "  \"layerHeight\": " << layerHeight << ",\n";
        json << "  \"infillDensity\": " << infillDensity << ",\n";
        json << "  \"totalLayers\": " << layers.size() << ",\n";
        json << "  \"boundingBox\": [";
        
        auto bbox = getBoundingBox();
        for (size_t i = 0; i < bbox.size(); i++) {
            if (i > 0) json << ", ";
            json << bbox[i];
        }
        json << "],\n";
        json << "  \"layers\": [\n";
        
        for (size_t i = 0; i < layers.size(); i++) {
            if (i > 0) json << ",\n";
            json << "    {\n";
            json << "      \"height\": " << layers[i].height << ",\n";
            json << "      \"contourCount\": " << layers[i].contours.size() << ",\n";
            json << "      \"infillCount\": " << layers[i].infill.size() << "\n";
            json << "    }";
        }
        
        json << "\n  ]\n";
        json << "}";
        
        return json.str();
    }
};

// Emscripten 바인딩
EMSCRIPTEN_BINDINGS(slicer_module) {
    class_<Vector3>("Vector3")
        .constructor<double, double, double>()
        .property("x", &Vector3::x)
        .property("y", &Vector3::y)
        .property("z", &Vector3::z);
    
    class_<SimpleSlicer>("SimpleSlicer")
        .constructor<>()
        .function("setLayerHeight", &SimpleSlicer::setLayerHeight)
        .function("setInfillDensity", &SimpleSlicer::setInfillDensity)
        .function("parseSTL", &SimpleSlicer::parseSTL)
        .function("getBoundingBox", &SimpleSlicer::getBoundingBox)
        .function("generateGCode", &SimpleSlicer::generateGCode)
        .function("getLayerInfo", &SimpleSlicer::getLayerInfo);
} 